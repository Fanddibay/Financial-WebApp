<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import CurrencyInput from '@/components/ui/CurrencyInput.vue'
import { useSplitStore } from '@/stores/split'
import { usePocketStore } from '@/stores/pocket'
import { usePocketLimits } from '@/composables/usePocketLimits'
import { useTokenStore } from '@/stores/token'
import { formatIDR } from '@/utils/currency'
import { computeItemizedParticipantShares } from '@/services/splitService'
import { generateSplitSummaryImage } from '@/utils/splitImageGenerator'
import type { Split, SplitItem } from '@/types/split'
import { MAIN_POCKET_ID } from '@/services/pocketService'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useI18n } from 'vue-i18n'
import { useToastStore } from '@/stores/toast'

const { t, locale } = useI18n()
const toast = useToastStore()

interface Props {
  isOpen: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{ close: [] }>()

const splitStore = useSplitStore()
const pocketStore = usePocketStore()
const { getActivePockets } = usePocketLimits()
const tokenStore = useTokenStore()

type ParticipantWithItems = {
  name: string
  isMe?: boolean
  items: { name: string; qty: number; unit_price: number; price: number }[]
}

const step = ref<'items' | 'tax' | 'summary' | 'success'>('items')
const placeName = ref('')
const participants = ref<ParticipantWithItems[]>([
  { name: 'Kamu', isMe: true, items: [{ name: '', qty: 0, unit_price: 0, price: 0 }] },
])
const taxPercent = ref(11)
const servicePercent = ref(10)
const splitTaxAndServiceEqually = ref(false)
const pocketId = ref(MAIN_POCKET_ID)
const createdSplit = ref<Split | null>(null)
const savingImage = ref(false)
const editingSplitId = ref<string | null>(null)
const lastItemNameRef = ref<HTMLInputElement | null>(null)
const showSplitBillLimitInfoSheet = ref(false)

const activePockets = computed(() =>
  getActivePockets(pocketStore.pockets, tokenStore.isLicenseActive),
)
const effectivePocketId = computed(
  () =>
    activePockets.value.find((p) => p.id === pocketId.value)?.id ?? activePockets.value[0]?.id ?? MAIN_POCKET_ID,
)

const items = computed<SplitItem[]>(() =>
  participants.value.flatMap((p) =>
    p.items.map((i) => ({
      name: i.name,
      qty: i.qty,
      unit_price: i.unit_price,
      price: i.price,
      participant_name: p.name,
    })),
  ),
)
const subtotal = computed(() => items.value.reduce((s, i) => s + i.price, 0))
const taxAmount = computed(() => Math.round((subtotal.value * taxPercent.value) / 100))
const serviceAmount = computed(() => Math.round((subtotal.value * servicePercent.value) / 100))
const finalTotal = computed(() => subtotal.value + taxAmount.value + serviceAmount.value)

const computedParticipants = computed(() =>
  computeItemizedParticipantShares(
    items.value,
    participantNames.value,
    taxPercent.value,
    servicePercent.value,
    false,
    splitTaxAndServiceEqually.value,
  ),
)
const myPortion = computed(() => {
  const me = computedParticipants.value.find((p) => p.isMe)
  return me?.amount ?? 0
})

const participantNames = computed(() =>
  participants.value.map((p) => ({ name: p.name, isMe: p.isMe })),
)
const canProceedFromItems = computed(() => {
  if (!placeName.value.trim()) return false
  if (participants.value.length < 2) return false
  const invalidName = participants.value.some((p) => !p.name.trim())
  if (invalidName) return false
  const invalidItem = items.value.some(
    (i) => !i.name.trim() || (i.qty ?? 1) < 1 || (i.unit_price ?? 0) <= 0 || i.price <= 0 || !i.participant_name,
  )
  return !invalidItem && subtotal.value > 0
})

const sheetTitle = computed(() => {
  if (step.value === 'success') return t('split.successTitle')
  if (step.value === 'summary') return t('split.summaryTitle')
  if (step.value === 'tax') return t('split.taxServiceTitle')
  return t('split.itemsTitle')
})
const sheetSubtitle = computed(() => {
  if (step.value === 'items') return t('split.itemsSubtitle')
  if (step.value === 'tax') return t('split.subtotal') + ': ' + formatIDR(subtotal.value)
  return undefined
})

const splitBillUsageInfo = computed(() => tokenStore.getSplitBillUsageInfo())
const splitBillUsageBadge = computed(() =>
  t('split.basicLimitBadge', {
    used: splitBillUsageInfo.value.used,
    limit: splitBillUsageInfo.value.limit,
    days:
      splitBillUsageInfo.value.daysRemaining > 0
        ? splitBillUsageInfo.value.daysRemaining
        : tokenStore.SPLIT_BILL_COOLDOWN_DAYS,
  }),
)

function groupItemsByParticipant(
  flatItems: SplitItem[],
  participantMeta: { name: string; isMe?: boolean }[],
): ParticipantWithItems[] {
  const byName = new Map<string, { name: string; qty: number; unit_price: number; price: number }[]>()
  for (const p of participantMeta) {
    byName.set(p.name, [])
  }
  for (const i of flatItems) {
    const list = byName.get(i.participant_name)
    if (list) {
      const qty = Math.max(1, Math.round(i.qty ?? 1))
      const inferredUnit = qty > 0 ? Math.round(i.price / qty) : i.price
      const unitPrice = Math.max(0, Math.round(i.unit_price ?? inferredUnit))
      list.push({ name: i.name, qty, unit_price: unitPrice, price: qty * unitPrice })
    }
  }
  return participantMeta.map((p) => {
    const itemList = byName.get(p.name) ?? []
    return {
      name: p.name,
      isMe: p.isMe,
      items: itemList.length > 0 ? itemList : [{ name: '', qty: 0, unit_price: 0, price: 0 }],
    }
  })
}


watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      pocketStore.fetchPockets()
      step.value = editingSplitId.value ? 'items' : 'items'
      const editId = editingSplitId.value
      const existing = editId ? splitStore.getSplitById(editId) : null
      if (existing?.items && existing.items.length > 0) {
        placeName.value = existing.place_name ?? ''
        participants.value = groupItemsByParticipant(existing.items, existing.participants)
        taxPercent.value = existing.tax_percent ?? 11
        servicePercent.value = existing.service_percent ?? 10
        splitTaxAndServiceEqually.value = existing.split_tax_service_equally ?? false
        pocketId.value = existing.pocket_id ?? effectivePocketId.value
      } else {
        placeName.value = ''
        participants.value = [{ name: 'Kamu', isMe: true, items: [{ name: '', qty: 0, unit_price: 0, price: 0 }] }]
        taxPercent.value = 11
        servicePercent.value = 10
        splitTaxAndServiceEqually.value = false
        pocketId.value = effectivePocketId.value
      }
      createdSplit.value = null
      if (!editId) editingSplitId.value = null
    } else {
      step.value = 'items'
      editingSplitId.value = null
    }
  },
)

function addParticipant() {
  participants.value = [
    ...participants.value,
    { name: '', isMe: false, items: [{ name: '', qty: 0, unit_price: 0, price: 0 }] },
  ]
}

function removeParticipant(index: number) {
  const p = participants.value[index]
  if (p?.isMe) return
  if (participants.value.length <= 1) return
  participants.value = participants.value.filter((_, i) => i !== index)
}

function updateParticipantName(index: number, name: string) {
  const list = participants.value.map((p) => ({ ...p, items: [...p.items] }))
  if (list[index]) list[index]!.name = name.trim() || list[index]!.name
  participants.value = list
}

function setLastItemNameEl(el: unknown) {
  lastItemNameRef.value = el instanceof HTMLInputElement ? el : null
}

function addItemForParticipant(participantIndex: number) {
  const list = participants.value.map((p) => ({ ...p, items: [...p.items] }))
  const p = list[participantIndex]
  if (p) {
    p.items.push({ name: '', qty: 0, unit_price: 0, price: 0 })
    participants.value = list
    nextTick(() => {
      try {
        lastItemNameRef.value?.focus()
      } catch {
        /* ignore focus errors */
      }
    })
  }
}

function removeItem(participantIndex: number, itemIndex: number) {
  const list = participants.value.map((p) => ({ ...p, items: [...p.items] }))
  const p = list[participantIndex]
  if (p && p.items.length > 1) {
    p.items.splice(itemIndex, 1)
    participants.value = list
  }
}

function updateItem(
  participantIndex: number,
  itemIndex: number,
  updates: { name?: string; qty?: number; unit_price?: number },
) {
  const list = participants.value.map((p) => ({ ...p, items: p.items.map((i) => ({ ...i })) }))
  const item = list[participantIndex]?.items[itemIndex]
  if (item) {
    if (typeof updates.name === 'string') item.name = updates.name
    if (typeof updates.qty === 'number') item.qty = Math.max(0, Math.round(updates.qty))
    if (typeof updates.unit_price === 'number') item.unit_price = Math.max(0, Math.round(updates.unit_price))
    item.price = item.qty * item.unit_price
  }
  participants.value = list
}

function nextStep() {
  if (step.value === 'items' && canProceedFromItems.value) step.value = 'tax'
  else if (step.value === 'tax') step.value = 'summary'
}

function backStep() {
  if (step.value === 'tax') step.value = 'items'
  else if (step.value === 'summary') step.value = 'tax'
}

async function submitSplit() {
  if (!placeName.value.trim()) return
  if (!tokenStore.canUseSplitBill()) {
    const info = tokenStore.getSplitBillUsageInfo()
    toast.error(t('split.basicLimitWait', { days: info.daysRemaining }))
    return
  }
  const validItems = items.value.filter((i) => i.name.trim() && i.price > 0 && i.participant_name)
  if (validItems.length === 0) return
  try {
    const split = await splitStore.createSplitItemized(
      placeName.value.trim(),
      validItems,
      participantNames.value,
      taxPercent.value,
      servicePercent.value,
      false,
      effectivePocketId.value,
      splitTaxAndServiceEqually.value,
    )
    tokenStore.recordSplitBillUse()
    createdSplit.value = split
    step.value = 'success'
    toast.success(t('split.successTitle'))
  } catch {
    // Error from store
  }
}

async function handleUpdateSplit() {
  if (!editingSplitId.value) return
  if (!placeName.value.trim()) return
  const validItems = items.value.filter((i) => i.name.trim() && i.price > 0 && i.participant_name)
  if (validItems.length === 0) return
  try {
    await splitStore.updateSplit(editingSplitId.value, {
      place_name: placeName.value.trim(),
      items: validItems,
      participantNames: participantNames.value,
      tax_percent: taxPercent.value,
      service_percent: servicePercent.value,
      exclude_service_for_me: false,
      split_tax_service_equally: splitTaxAndServiceEqually.value,
      pocket_id: effectivePocketId.value,
    })
    const updated = splitStore.getSplitById(editingSplitId.value)
    createdSplit.value = updated ?? null
    editingSplitId.value = null
    step.value = 'success'
  } catch {
    // Error from store
  }
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

function getSplitFinalTotal(split: Split): number {
  if (split.final_total != null) return split.final_total
  const sub = split.subtotal ?? split.total_bill
  return sub + Math.round((sub * split.tax_percent) / 100) + Math.round((sub * split.service_percent) / 100)
}

function buildWhatsAppShareMessage(split: Split): string {
  const totalFinal = getSplitFinalTotal(split)
  const participantSum = split.participants.reduce((s, p) => s + p.amount, 0)
  if (
    !split.participants?.length ||
    Math.abs(participantSum - totalFinal) > 1
  ) {
    return ''
  }

  const dateLocale = locale.value === 'id' ? 'id-ID' : 'en-GB'
  const date = new Date(split.created_at).toLocaleDateString(dateLocale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  const lines: string[] = ['Patungan kemarin udah aku bayarin dulu ya 👀', '']
  const place = split.place_name?.trim()
  if (place) {
    lines.push(`📍 ${place}`)
    lines.push(`📅 ${date}`)
  } else {
    lines.push(`📅 ${date}`)
  }
  lines.push('')
  lines.push(`Total Tagihan: ${formatIDR(totalFinal)}`)
  lines.push('')
  lines.push('Rinciannya:')
  for (const p of split.participants) {
    const label = p.isMe ? 'Aku' : p.name
    lines.push(`• ${label}: ${formatIDR(p.amount)}`)
  }
  if (split.items && split.items.length > 0) {
    const top3 = split.items.slice(0, 3)
    lines.push('')
    lines.push('Item: ' + top3.map((i) => i.name).join(', ') + (split.items.length > 3 ? '...' : ''))
  }
  lines.push('')
  lines.push('Kamu tinggal transfer sesuai nominal di atas ya 🙌')
  lines.push('')
  lines.push('Generated with Fanplanner ✨')
  return lines.join('\n')
}

function handleShareWhatsApp() {
  const split = createdSplit.value
  if (!split) return
  const totalFinal = getSplitFinalTotal(split)
  const participantSum = split.participants.reduce((s, p) => s + p.amount, 0)
  if (!split.participants?.length || Math.abs(participantSum - totalFinal) > 1) {
    toast.error(t('split.shareDataIncomplete'))
    return
  }
  const message = buildWhatsAppShareMessage(split)
  if (!message) {
    toast.error(t('split.shareDataIncomplete'))
    return
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
}

function handleEdit() {
  if (!createdSplit.value) return
  editingSplitId.value = createdSplit.value.id
  placeName.value = createdSplit.value.place_name ?? ''
  participants.value = groupItemsByParticipant(
    (createdSplit.value.items ?? []).map((i) => ({ ...i })),
    createdSplit.value.participants.map((p) => ({ name: p.name, isMe: p.isMe })),
  )
  taxPercent.value = createdSplit.value.tax_percent ?? 11
  servicePercent.value = createdSplit.value.service_percent ?? 10
  splitTaxAndServiceEqually.value = createdSplit.value.split_tax_service_equally ?? false
  pocketId.value = createdSplit.value.pocket_id ?? effectivePocketId.value
  step.value = 'items'
  createdSplit.value = null
}

function handleDone() {
  emit('close')
}

function handleClose() {
  if (step.value === 'success' && createdSplit.value) {
    emit('close')
    return
  }
  if (step.value !== 'items') {
    backStep()
  } else {
    emit('close')
  }
}
</script>

<template>
  <BottomSheet :is-open="isOpen" :title="sheetTitle" :subtitle="sheetSubtitle" max-height="90" @close="handleClose">
    <template #header-actions>
      <button
        v-if="!tokenStore.isLicenseActive"
        type="button"
        class="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-900/25 dark:text-amber-200"
        @click="showSplitBillLimitInfoSheet = true"
      >
        {{ splitBillUsageBadge }}
      </button>
    </template>
    <!-- Step 1: Bill Items (reduced horizontal padding, no white card bg) -->
    <div v-if="step === 'items'" class="space-y-4 -mx-2 px-2">
      <div>
        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">{{ t('split.placeName') }}</label>
        <input v-model="placeName" type="text" :placeholder="t('split.placeNamePlaceholder')"
          class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500" />
      </div>

      <!-- Person-centric: each person = name + their items -->
      <div class="space-y-4">
        <p class="text-sm font-medium text-slate-700 dark:text-slate-300">{{ t('split.itemsSubtitle') }}</p>
        <div v-for="(p, pIdx) in participants" :key="pIdx" :class="[
          'rounded-xl border p-3',
          p.isMe ? 'border-brand/30 dark:border-brand/40' : 'border-slate-200 dark:border-slate-700',
        ]">
          <div class="mb-3 flex items-center justify-between gap-2">
            <input :value="p.name" type="text"
              :placeholder="p.isMe ? t('split.you') : t('split.participantNamePlaceholder')" :readonly="p.isMe" :class="[
                'flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2',
                p.isMe
                  ? 'border-transparent bg-transparent text-brand dark:text-brand-light'
                  : 'border-slate-200 bg-white text-slate-900 focus:border-brand focus:ring-brand/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100',
              ]" @input="updateParticipantName(pIdx, ($event.target as HTMLInputElement).value)" />
            <button v-if="!p.isMe" type="button"
              class="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-slate-700 dark:hover:text-red-400"
              :aria-label="t('common.delete')" @click="removeParticipant(pIdx)">
              <font-awesome-icon :icon="['fas', 'trash']" class="h-4 w-4" />
            </button>
          </div>
          <div class="space-y-2 pl-0.5">
            <div v-for="(item, iIdx) in p.items" :key="iIdx"
              class="space-y-2 rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-700 dark:bg-slate-800/70">
              <div class="flex items-center gap-2">
                <input :ref="pIdx === participants.length - 1 && iIdx === p.items.length - 1
                  ? setLastItemNameEl
                  : undefined
                  " :value="item.name" type="text" :placeholder="t('split.itemNamePlaceholder')"
                  class="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                  @input="updateItem(pIdx, iIdx, { name: ($event.target as HTMLInputElement).value })" />
                <button v-if="p.items.length > 1" type="button"
                  class="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-slate-700 dark:hover:text-red-400"
                  :aria-label="t('common.delete')" @click="removeItem(pIdx, iIdx)">
                  <font-awesome-icon :icon="['fas', 'trash']" class="h-4 w-4" />
                </button>
              </div>

              <div class="grid grid-cols-2 gap-2">
                <div>
                  <p class="mb-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">Nominal</p>
                  <CurrencyInput :model-value="item.unit_price"
                    @update:model-value="(v: number) => updateItem(pIdx, iIdx, { unit_price: v })" />
                </div>
                <div>
                  <p class="mb-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">Qty</p>
                  <input :value="item.qty" type="number" min="0" step="1"
                    class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                    @input="updateItem(pIdx, iIdx, { qty: Number(($event.target as HTMLInputElement).value || 0) })" />
                </div>
              </div>

              <p class="text-right text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {{ t('split.subtotal') }}: {{ formatIDR(item.price) }}
              </p>
            </div>
            <button type="button"
              class="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 py-2 text-sm text-slate-500 hover:border-brand hover:text-brand dark:border-slate-600 dark:hover:border-brand"
              @click="addItemForParticipant(pIdx)">
              <font-awesome-icon :icon="['fas', 'plus']" class="h-3.5 w-3.5" />
              {{ t('split.addItem') }}
            </button>
          </div>
        </div>
        <button type="button"
          class="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-3 text-sm font-medium text-slate-500 hover:border-brand hover:text-brand dark:border-slate-600 dark:hover:border-brand"
          @click="addParticipant">
          <font-awesome-icon :icon="['fas', 'user']" class="h-4 w-4" />
          {{ t('split.addPerson') }}
        </button>
      </div>

      <div class="rounded-xl bg-slate-100/80 px-3 py-2.5 dark:bg-slate-800/50">
        <p class="text-sm font-medium text-slate-700 dark:text-slate-300">
          {{ t('split.subtotal') }}: {{ formatIDR(subtotal) }}
        </p>
      </div>
    </div>

    <!-- Step 2: Tax & Service -->
    <div v-else-if="step === 'tax'" class="space-y-4">
      <div class="rounded-xl bg-brand/10 px-4 py-3 dark:bg-brand/20">
        <p class="text-sm font-medium text-slate-700 dark:text-slate-300">{{ t('split.subtotal') }}</p>
        <p class="text-xl font-bold tabular-nums text-brand dark:text-brand-light">{{ formatIDR(subtotal) }}</p>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">{{ t('split.taxPercent')
            }}</label>
          <input v-model.number="taxPercent" type="number" min="0" max="100" step="0.5"
            class="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" />
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">{{ t('split.servicePercent')
            }}</label>
          <input v-model.number="servicePercent" type="number" min="0" max="100" step="0.5"
            class="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" />
        </div>
      </div>
      <div class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/50">
        <div class="flex items-center justify-between gap-3">
          <button type="button" role="switch" :aria-checked="splitTaxAndServiceEqually"
            class="relative !min-h-0 !min-w-0 h-6 w-10 shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand/40"
            :class="splitTaxAndServiceEqually ? 'bg-brand' : 'bg-slate-400 dark:bg-slate-600'"
            @click="splitTaxAndServiceEqually = !splitTaxAndServiceEqually">
            <span class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
              :class="splitTaxAndServiceEqually ? 'translate-x-4' : 'translate-x-0'" />
          </button>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-slate-700 dark:text-slate-300">{{ t('split.splitTaxServiceEqually') }}
            </p>
            <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{{ t('split.splitTaxServiceEquallyDesc') }}</p>
          </div>

        </div>
      </div>
      <div class="rounded-xl bg-brand/10 px-4 py-3 dark:bg-brand/20">
        <p class="text-sm font-medium text-slate-700 dark:text-slate-300">{{ t('split.totalAfterTaxService') }}</p>
        <p class="mt-1 text-xl font-bold tabular-nums text-brand dark:text-brand-light">{{ formatIDR(finalTotal) }}</p>
      </div>
      <div v-if="activePockets.length > 1" class="space-y-2">
        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">{{ t('pocket.selectPocket')
          }}</label>
        <select v-model="pocketId"
          class="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
          <option v-for="p in activePockets" :key="p.id" :value="p.id">{{ p.icon }} {{ p.name }}</option>
        </select>
      </div>
    </div>

    <!-- Step 3: Summary (grouped by person: items + PPN + service per orang) -->
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
              v-for="(item, idx) in items.filter((i) => i.participant_name === p.name && i.name.trim() && i.price > 0)"
              :key="idx" class="flex justify-between">
              <span class="min-w-0 truncate pr-2">{{ item.name.trim() }}</span>
              <span class="shrink-0 tabular-nums">{{ formatIDR(item.price) }}</span>
            </div>
          </div>
          <div class="mt-2 space-y-1 border-t border-slate-200/80 pt-2 text-sm dark:border-slate-600/80">
            <div class="flex justify-between">
              <span class="text-slate-500 dark:text-slate-400">{{ t('split.subtotal') }}</span>
              <span class="tabular-nums">{{ formatIDR(p.subtotal ?? 0) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500 dark:text-slate-400">{{ t('split.taxLabel') }} ({{ taxPercent }}%)</span>
              <span class="tabular-nums">{{ formatIDR(p.tax_share ?? 0) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500 dark:text-slate-400">{{ t('split.serviceLabel') }} ({{ servicePercent
                }}%)</span>
              <span class="tabular-nums">{{ formatIDR(p.service_share ?? 0) }}</span>
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
      <BaseButton variant="primary" class="w-full font-semibold"
        @click="editingSplitId ? handleUpdateSplit() : submitSplit()">
        {{ t('split.createSplit') }}
      </BaseButton>
    </div>

    <!-- Step 4: Success -->
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
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {{ t('split.totalBill') }}: {{ formatIDR(getSplitFinalTotal(createdSplit)) }}
          </p>
        </div>
      </div>
      <div class="flex flex-col gap-2">
        <BaseButton variant="secondary" :disabled="savingImage" @click="handleSaveImage">
          <font-awesome-icon :icon="['fas', 'image']" class="mr-2 h-4 w-4" />
          {{ t('split.saveImage') }}
        </BaseButton>
        <BaseButton variant="secondary" @click="handleShareWhatsApp">
          <font-awesome-icon :icon="['fab', 'whatsapp']" class="mr-2 h-4 w-4" />
          {{ t('split.shareWhatsApp') }}
        </BaseButton>
        <BaseButton variant="ghost" @click="handleEdit">
          <font-awesome-icon :icon="['fas', 'edit']" class="mr-2 h-4 w-4" />
          {{ t('common.edit') }}
        </BaseButton>
        <BaseButton variant="primary" class="w-full" @click="handleDone">
          {{ t('split.done') }}
        </BaseButton>
      </div>
    </div>

    <template #footer>
      <div v-if="step === 'items'" class="flex justify-end">
        <BaseButton variant="primary" :disabled="!canProceedFromItems" @click="nextStep">
          {{ t('common.continue') }}
        </BaseButton>
      </div>
      <div v-else-if="step === 'tax'" class="flex justify-between">
        <BaseButton variant="ghost" @click="backStep">{{ t('nav.back') }}</BaseButton>
        <BaseButton variant="primary" @click="nextStep">
          {{ t('split.generateSplit') }}
        </BaseButton>
      </div>
      <div v-else-if="step === 'summary'" class="flex justify-between">
        <BaseButton variant="ghost" @click="backStep">{{ t('nav.back') }}</BaseButton>
      </div>
    </template>
  </BottomSheet>

  <BottomSheet
    :is-open="showSplitBillLimitInfoSheet"
    :title="t('split.basicLimitTitle')"
    :subtitle="t('split.basicLimitSubtitle')"
    max-height="60"
    @close="showSplitBillLimitInfoSheet = false"
  >
    <div class="space-y-3">
      <p class="text-sm text-slate-600 dark:text-slate-400">
        {{ t('split.basicLimitDesc') }}
      </p>
      <p class="text-sm font-medium text-slate-800 dark:text-slate-200">
        {{ t('split.basicLimitStatus', { used: splitBillUsageInfo.used, limit: splitBillUsageInfo.limit }) }}
      </p>
      <p v-if="!splitBillUsageInfo.canUse" class="text-sm text-amber-700 dark:text-amber-300">
        {{ t('split.basicLimitWait', { days: splitBillUsageInfo.daysRemaining }) }}
      </p>
      <BaseButton class="w-full" @click="showSplitBillLimitInfoSheet = false">{{ t('split.done') }}</BaseButton>
    </div>
  </BottomSheet>
</template>
