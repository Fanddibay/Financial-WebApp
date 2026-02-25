<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import PageHeader from '@/components/layout/PageHeader.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import CurrencyInput from '@/components/ui/CurrencyInput.vue'
import { formatIDR } from '@/utils/currency'
import { extractReceiptItems } from '@/services/receiptOcrService'
import { useSplitStore } from '@/stores/split'
import { usePocketStore } from '@/stores/pocket'
import { useTokenStore } from '@/stores/token'
import { usePocketLimits } from '@/composables/usePocketLimits'
import { computeItemizedParticipantShares } from '@/services/splitService'
import { generateSplitSummaryImage } from '@/utils/splitImageGenerator'
import { MAIN_POCKET_ID } from '@/services/pocketService'
import type { Split, SplitItem } from '@/types/split'
import { useToastStore } from '@/stores/toast'
import { isHeicFile } from '@/utils/heicConverter'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const splitStore = useSplitStore()
const pocketStore = usePocketStore()
const tokenStore = useTokenStore()
const { getActivePockets } = usePocketLimits()
const toast = useToastStore()

type Step = 'capture' | 'review' | 'people' | 'assign' | 'tax' | 'summary' | 'success'

interface ReviewRow {
  id: string
  name: string
  qty: number
  unit_price: number
}

interface ParticipantRow {
  name: string
  isMe: boolean
}

function genId() {
  return `r-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

const step = ref<Step>('capture')
const mode = computed(() => (route.query.mode === 'upload' ? 'upload' : 'camera'))

const previewUrl = ref<string | null>(null)
const selectedFile = ref<File | null>(null)
const processing = ref(false)
const ocrError = ref<string | null>(null)
const showBlurWarning = ref(false)

const reviewItems = ref<ReviewRow[]>([])
const participants = ref<ParticipantRow[]>([{ name: 'Kamu', isMe: true }])
/** itemId -> personName -> qty assigned (allows splitting one item across people when qty > 1) */
const allocation = ref<Record<string, Record<string, number>>>({})

const placeName = ref('')
const taxPercent = ref(11)
const servicePercent = ref(10)
const excludeServiceForMe = ref(false)
const splitTaxAndServiceEqually = ref(false)
const pocketId = ref(MAIN_POCKET_ID)
const createdSplit = ref<Split | null>(null)
const savingImage = ref(false)

function effectiveQty(row: ReviewRow): number {
  return row.qty < 1 ? 1 : row.qty
}

const activePockets = computed(() =>
  getActivePockets(pocketStore.pockets, tokenStore.isLicenseActive),
)
const effectivePocketId = computed(
  () =>
    activePockets.value.find((p) => p.id === pocketId.value)?.id ?? activePockets.value[0]?.id ?? MAIN_POCKET_ID,
)

const reviewValid = computed(() => {
  if (reviewItems.value.length === 0) return false
  return reviewItems.value.every(
    (i) =>
      i.name.trim() !== '' &&
      effectiveQty(i) >= 1 &&
      i.unit_price > 0,
  )
})

function assignedTotalForItem(itemId: string): number {
  const row = reviewItems.value.find((r) => r.id === itemId)
  if (!row) return 0
  const perPerson = allocation.value[itemId]
  if (!perPerson) return 0
  return participants.value.reduce((s, p) => s + (perPerson[p.name] ?? 0), 0)
}

function remainingForItem(itemId: string): number {
  const row = reviewItems.value.find((r) => r.id === itemId)
  if (!row) return 0
  return Math.max(0, effectiveQty(row) - assignedTotalForItem(itemId))
}

function allocationForPersonItem(itemId: string, personName: string): number {
  return allocation.value[itemId]?.[personName] ?? 0
}

const totalUnitsToAssign = computed(() =>
  reviewItems.value.reduce((s, r) => s + effectiveQty(r), 0),
)
const totalUnitsAssigned = computed(() =>
  reviewItems.value.reduce((s, row) => s + assignedTotalForItem(row.id), 0),
)
const allFullyAssigned = computed(() =>
  totalUnitsToAssign.value > 0 && totalUnitsAssigned.value === totalUnitsToAssign.value,
)

const itemsForSplit = computed<SplitItem[]>(() => {
  const out: SplitItem[] = []
  for (const row of reviewItems.value) {
    const perPerson = allocation.value[row.id]
    if (!perPerson) continue
    for (const p of participants.value) {
      const q = perPerson[p.name] ?? 0
      if (q > 0) {
        out.push({
          name: row.name.trim(),
          price: q * row.unit_price,
          participant_name: p.name,
        })
      }
    }
  }
  return out
})

const participantNames = computed(() =>
  participants.value.map((p) => ({ name: p.name, isMe: p.isMe })),
)

const computedParticipants = computed(() =>
  computeItemizedParticipantShares(
    itemsForSplit.value,
    participantNames.value,
    taxPercent.value,
    servicePercent.value,
    excludeServiceForMe.value,
    splitTaxAndServiceEqually.value,
  ),
)

const subtotal = computed(() =>
  reviewItems.value.reduce((s, i) => s + effectiveQty(i) * i.unit_price, 0),
)
const taxAmount = computed(() => Math.round((subtotal.value * taxPercent.value) / 100))
const serviceAmount = computed(() => Math.round((subtotal.value * servicePercent.value) / 100))
const finalTotal = computed(() => subtotal.value + taxAmount.value + serviceAmount.value)
const myPortion = computed(() => {
  const me = computedParticipants.value.find((p) => p.isMe)
  return me?.amount ?? 0
})

const selectedAssignPerson = ref<string | null>(null)
const selectedPersonName = computed(() => selectedAssignPerson.value ?? participants.value[0]?.name ?? null)

function subtotalForPerson(personName: string): number {
  return reviewItems.value.reduce((s, row) => {
    const q = allocation.value[row.id]?.[personName] ?? 0
    return s + q * row.unit_price
  }, 0)
}

function setAllocationQty(itemId: string, personName: string, qty: number) {
  const row = reviewItems.value.find((r) => r.id === itemId)
  if (!row) return
  const maxQty = effectiveQty(row)
  const currentTotal = assignedTotalForItem(itemId)
  const currentForPerson = allocationForPersonItem(itemId, personName)
  const otherTotal = currentTotal - currentForPerson
  const clamped = Math.max(0, Math.min(qty, maxQty - otherTotal))
  const next = { ...allocation.value }
  if (!next[itemId]) next[itemId] = {}
  if (clamped === 0) {
    const rest = { ...next[itemId] }
    delete rest[personName]
    next[itemId] = Object.keys(rest).length ? rest : {}
  } else {
    next[itemId] = { ...next[itemId], [personName]: clamped }
  }
  if (Object.keys(next[itemId]).length === 0) delete next[itemId]
  allocation.value = next
}

function incrementAllocation(itemId: string, personName: string) {
  const current = allocationForPersonItem(itemId, personName)
  const remaining = remainingForItem(itemId)
  if (remaining <= 0) return
  setAllocationQty(itemId, personName, current + 1)
}

function decrementAllocation(itemId: string, personName: string) {
  const current = allocationForPersonItem(itemId, personName)
  if (current <= 0) return
  setAllocationQty(itemId, personName, current - 1)
}

const fileInput = ref<HTMLInputElement | null>(null)

function triggerFileInput() {
  fileInput.value?.click()
}

function retakeOrReupload() {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = null
  }
  selectedFile.value = null
  ocrError.value = null
  showBlurWarning.value = false
  if (fileInput.value) fileInput.value.value = ''
  nextTick(() => triggerFileInput())
}

function onFileSelected(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (isHeicFile(file)) {
    ocrError.value = 'Format HEIC tidak didukung. Gunakan JPEG atau PNG.'
    return
  }
  selectedFile.value = file
  previewUrl.value = URL.createObjectURL(file)
  step.value = 'capture'
  ocrError.value = null
  runOcr()
}

function runOcr() {
  if (!selectedFile.value) return
  processing.value = true
  ocrError.value = null
  showBlurWarning.value = false
  extractReceiptItems(selectedFile.value)
    .then((res) => {
      const rows: ReviewRow[] = res.items.map((i) => ({
        id: genId(),
        name: i.name,
        qty: i.qty,
        unit_price: i.unit_price,
      }))
      if (rows.length === 0) {
        rows.push({ id: genId(), name: 'Item dari struk', qty: 1, unit_price: res.parseResult.detectedAmount || 0 })
      }
      reviewItems.value = rows
      if (res.confidence < 50 && res.text.trim().length > 20) {
        showBlurWarning.value = true
      }
      step.value = 'review'
    })
    .catch((err) => {
      ocrError.value = err?.message ?? t('receiptScan.ocrFailedMessage')
    })
    .finally(() => {
      processing.value = false
    })
}

function addReviewRow() {
  reviewItems.value = [
    ...reviewItems.value,
    { id: genId(), name: '', qty: 1, unit_price: 0 },
  ]
}

function removeReviewRow(id: string) {
  reviewItems.value = reviewItems.value.filter((r) => r.id !== id)
  const next = { ...allocation.value }
  delete next[id]
  allocation.value = next
}

function updateReviewRow(id: string, updates: Partial<ReviewRow>) {
  reviewItems.value = reviewItems.value.map((r) =>
    r.id === id ? { ...r, ...updates } : r,
  )
}

function onQtyBlur(row: ReviewRow) {
  if (row.qty < 1) {
    updateReviewRow(row.id, { qty: 1 })
  }
}

function addParticipant() {
  if (!canAddPerson.value) return
  participants.value = [
    ...participants.value,
    { name: '', isMe: false },
  ]
}

function removeParticipant(index: number) {
  const p = participants.value[index]
  if (p?.isMe || participants.value.length <= 1) return
  const name = p?.name
  participants.value = participants.value.filter((_, i) => i !== index)
  if (name) {
    const next: Record<string, Record<string, number>> = {}
    for (const [itemId, perPerson] of Object.entries(allocation.value)) {
      const rest = { ...perPerson }
      delete rest[name]
      if (Object.keys(rest).length > 0) next[itemId] = rest
    }
    allocation.value = next
  }
}

function updateParticipantName(index: number, name: string) {
  const prev = participants.value[index]?.name
  const newName = name.trim() || prev
  participants.value = participants.value.map((p, i) =>
    i === index ? { ...p, name: newName } : p,
  )
  if (prev && newName && prev !== newName) {
    const next: Record<string, Record<string, number>> = {}
    for (const [itemId, perPerson] of Object.entries(allocation.value)) {
      const q = perPerson[prev]
      if (q != null) {
        next[itemId] = { ...perPerson, [newName]: q }
        delete next[itemId][prev]
      } else {
        next[itemId] = { ...perPerson }
      }
    }
    allocation.value = next
  }
}

watch(
  () => step.value,
  (s) => {
    if (s === 'assign' && participants.value.length > 0 && !selectedAssignPerson.value) {
      selectedAssignPerson.value = participants.value[0]!.name
    }
  },
)

function goBack() {
  if (step.value === 'capture') return
  if (step.value === 'review') step.value = 'capture'
  else if (step.value === 'people') step.value = 'review'
  else if (step.value === 'assign') step.value = 'people'
  else if (step.value === 'tax') step.value = 'assign'
  else if (step.value === 'summary') step.value = 'tax'
}

function nextStep() {
  if (step.value === 'review' && reviewValid.value) step.value = 'people'
  else if (step.value === 'people') step.value = 'assign'
  else if (step.value === 'assign' && allFullyAssigned.value) step.value = 'tax'
  else if (step.value === 'tax') step.value = 'summary'
}

async function submitSplit() {
  if (!tokenStore.canUseSplitBill()) {
    const info = tokenStore.getSplitBillUsageInfo()
    toast.error(t('split.basicLimitWait', { days: info.daysRemaining }))
    return
  }
  const validItems = itemsForSplit.value.filter(
    (i) => i.name.trim() && i.price > 0 && i.participant_name,
  )
  if (validItems.length === 0 || participantNames.value.length < 2) return
  try {
    const split = await splitStore.createSplitItemized(
      placeName.value.trim(),
      validItems,
      participantNames.value,
      taxPercent.value,
      servicePercent.value,
      excludeServiceForMe.value,
      effectivePocketId.value,
      splitTaxAndServiceEqually.value,
    )
    tokenStore.recordSplitBillUse()
    createdSplit.value = split
    step.value = 'success'
    toast.success(t('receiptScan.successTitle'))
  } catch {
    // store sets error
  }
}

function getSplitFinalTotal(split: Split): number {
  if (split.final_total != null) return split.final_total
  const sub = split.subtotal ?? split.total_bill
  return sub + Math.round((sub * split.tax_percent) / 100) + Math.round((sub * split.service_percent) / 100)
}

function buildWhatsAppShareMessage(split: Split): string {
  const totalFinal = getSplitFinalTotal(split)
  const lines: string[] = ['Patungan kemarin udah aku bayarin dulu ya 👀', '']
  if (split.place_name?.trim()) lines.push(`📍 ${split.place_name}`)
  lines.push('')
  lines.push(`Total Tagihan: ${formatIDR(totalFinal)}`)
  lines.push('')
  lines.push('Rinciannya:')
  for (const p of split.participants) {
    const label = p.isMe ? 'Aku' : p.name
    lines.push(`• ${label}: ${formatIDR(p.amount)}`)
  }
  lines.push('')
  lines.push('Generated with Fanplanner ✨')
  return lines.join('\n')
}

function handleShareWhatsApp() {
  const split = createdSplit.value
  if (!split) return
  const message = buildWhatsAppShareMessage(split)
  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
}

async function handleSaveImage() {
  if (!createdSplit.value) return
  savingImage.value = true
  try {
    const blob = await generateSplitSummaryImage(createdSplit.value)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `patungan-${(createdSplit.value.place_name || 'split').replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.png`
    a.click()
    URL.revokeObjectURL(url)
  } finally {
    savingImage.value = false
  }
}

function handleDone() {
  router.push('/')
}

const stepTitles: Record<Step, string> = {
  capture: 'Scan Struk',
  review: t('receiptScan.reviewTitle'),
  people: t('receiptScan.addPeopleTitle'),
  assign: t('receiptScan.assignTitle'),
  tax: t('receiptScan.taxServiceTitle'),
  summary: t('split.summaryTitle'),
  success: t('receiptScan.successTitle'),
}

const stepOrder: Step[] = ['capture', 'review', 'people', 'assign', 'tax', 'summary', 'success']
const currentStepIndex = computed(() => stepOrder.indexOf(step.value))

onMounted(() => {
  pocketStore.fetchPockets()
  if (step.value === 'capture' && route.query.mode) {
    nextTick(() => triggerFileInput())
  }
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-900">
    <PageHeader :title="stepTitles[step]" :show-back="step !== 'success' && step !== 'capture'" @back="goBack" />

    <!-- Progress steps: Review → People → Assign → Tax → Summary -->
    <div v-if="step !== 'capture' && step !== 'success'"
      class="flex items-center justify-center gap-1 border-b border-slate-200 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-800">
      <span v-for="(s, i) in ['review', 'people', 'assign', 'tax', 'summary']" :key="s" :class="[
        'rounded-full px-2 py-0.5 text-xs font-medium',
        currentStepIndex >= stepOrder.indexOf(s)
          ? 'bg-brand/20 text-brand dark:bg-brand/30'
          : 'bg-slate-200 text-slate-500 dark:bg-slate-600',
      ]">
        {{ i + 1 }}
      </span>
    </div>

    <main class="container mx-auto max-w-lg px-4 pb-24 pt-4">
      <!-- Step: Capture (no back; file picker opens automatically) -->
      <div v-if="step === 'capture'" class="space-y-4">
        <input ref="fileInput" type="file" accept="image/jpeg,image/png,image/jpg,image/webp"
          :capture="mode === 'camera' ? 'environment' : undefined" class="hidden" @change="onFileSelected" />

        <p class="text-sm text-slate-600 dark:text-slate-400">
          Pastikan struk terlihat jelas & tidak blur.
        </p>

        <div v-if="!previewUrl" class="flex flex-col gap-3">
          <BaseButton variant="primary" class="w-full" @click="triggerFileInput">
            <font-awesome-icon :icon="['fas', mode === 'camera' ? 'camera' : 'upload']" class="mr-2 h-5 w-5" />
            {{ mode === 'camera' ? t('split.takePhotoOption') : t('split.uploadOption') }}
          </BaseButton>
          <button type="button"
            class="text-sm text-slate-500 underline hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
            @click="router.push('/')">
            {{ t('receiptScan.cancel') }}
          </button>
        </div>

        <div v-else class="space-y-4">
          <div
            class="overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
            <img :src="previewUrl" alt="Preview" class="h-auto w-full object-contain max-h-72" />
          </div>

          <div class="flex flex-wrap gap-2">
            <BaseButton variant="secondary" size="sm" @click="retakeOrReupload">
              <font-awesome-icon :icon="['fas', mode === 'camera' ? 'camera' : 'upload']" class="mr-2 h-4 w-4" />
              {{ t('receiptScan.retakeUploadAgain') }}
            </BaseButton>
            <button type="button"
              class="text-sm text-slate-500 underline hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
              @click="router.push('/')">
              {{ t('receiptScan.cancel') }}
            </button>
          </div>

          <div v-if="processing"
            class="flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white py-12 dark:border-slate-700 dark:bg-slate-800">
            <div class="h-10 w-10 animate-spin rounded-full border-2 border-brand border-t-transparent" />
            <p class="text-sm font-medium text-slate-700 dark:text-slate-300">
              {{ t('receiptScan.readingReceipt') }}
            </p>
          </div>

          <div v-else-if="ocrError"
            class="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <p class="text-sm font-medium text-red-800 dark:text-red-200">
              {{ t('receiptScan.ocrFailedTitle') }}
            </p>
            <p class="mt-1 text-sm text-red-700 dark:text-red-300">
              {{ ocrError }}
            </p>
            <div class="mt-4 flex flex-wrap gap-2">
              <BaseButton variant="secondary" size="sm" @click="runOcr">
                {{ t('receiptScan.tryAgain') }}
              </BaseButton>
              <BaseButton variant="ghost" size="sm" @click="retakeOrReupload">
                {{ t('receiptScan.retakeUploadAgain') }}
              </BaseButton>
              <BaseButton variant="ghost" size="sm" @click="router.push('/')">
                {{ t('receiptScan.switchToManual') }}
              </BaseButton>
            </div>
          </div>
        </div>
      </div>

      <!-- Step: Review -->
      <div v-else-if="step === 'review'" class="space-y-4">
        <p v-if="showBlurWarning"
          class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
          {{ t('receiptScan.blurWarning') }}
        </p>
        <p class="text-sm text-slate-600 dark:text-slate-400">
          {{ t('receiptScan.reviewSubtitle') }}
        </p>

        <div class="space-y-2">
          <div v-for="row in reviewItems" :key="row.id"
            class="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
            <input v-model="row.name" type="text" :placeholder="t('receiptScan.itemName')"
              class="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              @input="updateReviewRow(row.id, { name: ($event.target as HTMLInputElement).value })" />
            <input :value="row.qty" type="number" min="0"
              class="w-16 rounded-lg border border-slate-200 px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              @input="(e) => { const v = parseInt((e.target as HTMLInputElement).value, 10); updateReviewRow(row.id, { qty: Number.isNaN(v) || v < 0 ? 0 : v }) }"
              @blur="onQtyBlur(row)" />
            <div class="w-28">
              <CurrencyInput :model-value="row.unit_price"
                @update:model-value="(v: number) => updateReviewRow(row.id, { unit_price: v })" />
            </div>
            <span class="w-24 shrink-0 text-right text-sm tabular-nums text-slate-600 dark:text-slate-400">
              {{ formatIDR(effectiveQty(row) * row.unit_price) }}
            </span>
            <button type="button"
              class="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-slate-700 dark:hover:text-red-400"
              :aria-label="t('common.delete')" @click="removeReviewRow(row.id)">
              <font-awesome-icon :icon="['fas', 'trash']" class="h-4 w-4" />
            </button>
          </div>
          <BaseButton variant="ghost" class="w-full border border-dashed" @click="addReviewRow">
            <font-awesome-icon :icon="['fas', 'plus']" class="mr-2 h-4 w-4" />
            {{ t('receiptScan.addRow') }}
          </BaseButton>
        </div>

        <div class="flex flex-wrap gap-2 justify-end">
          <BaseButton variant="ghost" @click="goBack">
            {{ t('receiptScan.back') }}
          </BaseButton>
          <BaseButton variant="primary" :disabled="!reviewValid" @click="nextStep">
            {{ t('receiptScan.continueAddPeople') }}
          </BaseButton>
        </div>
      </div>

      <!-- Step: People -->
      <div v-else-if="step === 'people'" class="space-y-4">
        <p class="text-sm text-slate-600 dark:text-slate-400">
          {{ t('receiptScan.tipAssignMultiple') }}
        </p>
        <p class="text-sm text-amber-700 dark:text-amber-400">
          {{ t('receiptScan.tipAssignMultiple') }}
        </p>

        <div class="space-y-2">
          <div v-for="(p, idx) in participants" :key="idx"
            class="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
            <input :value="p.name" type="text"
              :placeholder="p.isMe ? t('split.you') : t('split.participantNamePlaceholder')" :readonly="p.isMe"
              class="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              @input="updateParticipantName(idx, ($event.target as HTMLInputElement).value)" />
            <button v-if="!p.isMe" type="button"
              class="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-slate-700 dark:hover:text-red-400"
              :aria-label="t('common.delete')" @click="removeParticipant(idx)">
              <font-awesome-icon :icon="['fas', 'trash']" class="h-4 w-4" />
            </button>
          </div>
          <BaseButton variant="ghost" class="w-full border border-dashed" @click="addParticipant">
            <font-awesome-icon :icon="['fas', 'user-plus']" class="mr-2 h-4 w-4" />
            {{ t('receiptScan.addPerson') }}
          </BaseButton>
        </div>

        <div class="flex flex-wrap gap-2 justify-end">
          <BaseButton variant="ghost" @click="goBack">
            {{ t('receiptScan.back') }}
          </BaseButton>
          <BaseButton variant="primary" @click="nextStep">
            {{ t('receiptScan.continueToAssign') }}
          </BaseButton>
        </div>
      </div>

      <!-- Step: Assign (qty per person when item qty > 1) -->
      <div v-else-if="step === 'assign'" class="space-y-4">
        <p class="text-sm text-slate-600 dark:text-slate-400">
          {{ t('receiptScan.assignSubtitle') }}
        </p>

        <div class="flex flex-wrap gap-2">
          <button v-for="p in participants" :key="p.name" type="button" :class="[
            'rounded-full px-3 py-1.5 text-sm font-medium transition',
            selectedAssignPerson === p.name
              ? 'bg-brand text-white'
              : 'bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600',
          ]" @click="selectedAssignPerson = p.name">
            {{ p.isMe ? t('split.you') : p.name }}
          </button>
        </div>

        <div v-if="selectedPersonName" class="space-y-2">
          <p class="text-sm font-medium text-slate-700 dark:text-slate-300">
            {{ t('receiptScan.subtotalFor', {
              name: selectedPersonName === 'Kamu' ? t('split.you') : selectedPersonName,
              amount: formatIDR(subtotalForPerson(selectedPersonName)),
            }) }}
          </p>
          <div v-for="row in reviewItems" :key="row.id"
            class="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                  {{ row.name || t('receiptScan.itemName') }}
                </p>
                <p class="text-xs text-slate-500 dark:text-slate-400">
                  {{ effectiveQty(row) }} × {{ formatIDR(row.unit_price) }} = {{ formatIDR(effectiveQty(row) *
                    row.unit_price) }}
                </p>
                <span
                  class="mt-1 inline-block rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-400">
                  {{ t('receiptScan.remaining') }}: {{ remainingForItem(row.id) }}
                </span>
              </div>
              <div class="flex shrink-0 items-center gap-1.5">
                <button type="button"
                  class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                  :disabled="allocationForPersonItem(row.id, selectedPersonName) <= 0" aria-label="-"
                  @click="decrementAllocation(row.id, selectedPersonName)">
                  <font-awesome-icon :icon="['fas', 'minus']" class="h-3 w-3" />
                </button>
                <span
                  class="min-w-[1.75rem] text-center text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-200">
                  {{ allocationForPersonItem(row.id, selectedPersonName) }}
                </span>
                <button type="button"
                  class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                  :disabled="remainingForItem(row.id) <= 0" aria-label="+"
                  @click="incrementAllocation(row.id, selectedPersonName)">
                  <font-awesome-icon :icon="['fas', 'plus']" class="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <p class="text-sm text-slate-600 dark:text-slate-400">
          {{ t('receiptScan.itemsAssigned', { assigned: totalUnitsAssigned, total: totalUnitsToAssign }) }}
        </p>
        <p v-if="!allFullyAssigned" class="text-sm text-amber-700 dark:text-amber-400">
          {{ t('receiptScan.unassignedWarning', { count: totalUnitsToAssign - totalUnitsAssigned }) }}
        </p>

        <div class="flex flex-wrap gap-2 justify-end">
          <BaseButton variant="ghost" @click="goBack">
            {{ t('receiptScan.back') }}
          </BaseButton>
          <BaseButton variant="primary" :disabled="!allFullyAssigned" @click="nextStep">
            {{ t('receiptScan.continueToTax') }}
          </BaseButton>
        </div>
      </div>

      <!-- Step: Tax -->
      <div v-else-if="step === 'tax'" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">{{ t('receiptScan.placeName')
          }}</label>
          <input v-model="placeName" type="text" :placeholder="t('receiptScan.placeNamePlaceholder')"
            class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" />
        </div>
        <div class="rounded-xl bg-brand/10 px-4 py-3 dark:bg-brand/20">
          <p class="text-sm font-medium text-slate-700 dark:text-slate-300">{{ t('receiptScan.subtotal') }}</p>
          <p class="text-xl font-bold tabular-nums text-brand">{{ formatIDR(subtotal) }}</p>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">{{ t('split.taxPercent')
            }}</label>
            <input v-model.number="taxPercent" type="number" min="0" max="100" step="0.5"
              class="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">{{ t('split.servicePercent')
            }}</label>
            <input v-model.number="servicePercent" type="number" min="0" max="100" step="0.5"
              class="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" />
          </div>
        </div>
        <label
          class="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/50">
          <input v-model="excludeServiceForMe" type="checkbox"
            class="rounded border-slate-300 text-brand focus:ring-brand" />
          <span class="text-sm text-slate-700 dark:text-slate-300">{{ t('split.excludeServiceForMe') }}</span>
        </label>
        <label
          class="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/50">
          <input v-model="splitTaxAndServiceEqually" type="checkbox"
            class="rounded border-slate-300 text-brand focus:ring-brand" />
          <span class="text-sm text-slate-700 dark:text-slate-300">{{ t('split.splitTaxServiceEqually') }}</span>
        </label>
        <div v-if="activePockets.length > 1">
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">{{ t('receiptScan.selectPocket')
          }}</label>
          <select v-model="pocketId"
            class="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
            <option v-for="p in activePockets" :key="p.id" :value="p.id">{{ p.icon }} {{ p.name }}</option>
          </select>
        </div>
        <div class="flex flex-wrap gap-2 justify-end">
          <BaseButton variant="ghost" @click="goBack">
            {{ t('receiptScan.back') }}
          </BaseButton>
          <BaseButton variant="primary" @click="nextStep">
            {{ t('split.generateSplit') }}
          </BaseButton>
        </div>
      </div>

      <!-- Step: Summary -->
      <div v-else-if="step === 'summary'" class="space-y-4">
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
          <div v-for="(p, i) in computedParticipants" :key="i" :class="[
            'rounded-lg p-3',
            p.isMe ? 'bg-brand/10 dark:bg-brand/20' : 'bg-white dark:bg-slate-800/80',
          ]">
            <p class="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
              {{ p.isMe ? t('split.you') : p.name }}
            </p>
            <div class="space-y-1 text-sm text-slate-600 dark:text-slate-400">
              <div
                v-for="(item, idx) in itemsForSplit.filter((i) => i.participant_name === p.name && i.name.trim() && i.price > 0)"
                :key="idx" class="flex justify-between">
                <span class="min-w-0 truncate pr-2">{{ item.name }}</span>
                <span class="shrink-0 tabular-nums">{{ formatIDR(item.price) }}</span>
              </div>
            </div>
            <div class="mt-2 flex justify-between border-t border-slate-200 pt-2 font-medium dark:border-slate-600">
              <span class="text-slate-700 dark:text-slate-300">{{ t('split.finalTotal') }}</span>
              <span class="tabular-nums">{{ formatIDR(p.amount) }}</span>
            </div>
          </div>
          <div class="mt-3 flex justify-between border-t-2 border-slate-200 pt-3 dark:border-slate-600">
            <span class="font-medium text-slate-700 dark:text-slate-300">{{ t('split.finalTotal') }}</span>
            <span class="font-semibold tabular-nums">{{ formatIDR(finalTotal) }}</span>
          </div>
          <div class="mt-3 flex justify-between border-t border-slate-200 pt-3 dark:border-slate-600">
            <span class="font-medium text-brand">{{ t('split.yourPortion') }}</span>
            <span class="font-bold tabular-nums text-brand">{{ formatIDR(myPortion) }}</span>
          </div>
        </div>
        <div class="flex flex-wrap gap-2 justify-end">
          <BaseButton variant="ghost" @click="goBack">
            {{ t('receiptScan.back') }}
          </BaseButton>
          <BaseButton variant="primary" class="font-semibold" @click="submitSplit">
            {{ t('receiptScan.createSplit') }}
          </BaseButton>
        </div>
      </div>

      <!-- Step: Success -->
      <div v-else-if="step === 'success' && createdSplit" class="space-y-4">
        <div class="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <p class="font-medium text-slate-900 dark:text-slate-100">{{ createdSplit.place_name || t('split.patungan') }}
          </p>
          <p class="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            {{ new Date(createdSplit.created_at).toLocaleDateString('id-ID', { dateStyle: 'long' }) }}
          </p>
          <div class="mt-3 space-y-2">
            <div v-for="(p, i) in createdSplit.participants" :key="i" class="flex justify-between text-sm">
              <span>{{ p.isMe ? t('split.you') : p.name }}</span>
              <span class="tabular-nums">{{ formatIDR(p.amount) }}</span>
            </div>
          </div>
          <div class="mt-3 border-t border-slate-200 pt-3 dark:border-slate-600">
            <p class="font-semibold text-brand">{{ t('split.youPaid') }} {{ formatIDR(createdSplit.my_portion) }}</p>
          </div>
        </div>
        <div class="flex flex-col gap-2">
          <BaseButton variant="secondary" :disabled="savingImage" @click="handleSaveImage">
            <font-awesome-icon :icon="['fas', 'image']" class="mr-2 h-4 w-4" />
            {{ t('receiptScan.saveImage') }}
          </BaseButton>
          <BaseButton variant="secondary" @click="handleShareWhatsApp">
            <font-awesome-icon :icon="['fab', 'whatsapp']" class="mr-2 h-4 w-4" />
            {{ t('receiptScan.shareWhatsApp') }}
          </BaseButton>
          <BaseButton variant="primary" class="w-full" @click="handleDone">
            {{ t('receiptScan.done') }}
          </BaseButton>
        </div>
      </div>
    </main>

  </div>
</template>
