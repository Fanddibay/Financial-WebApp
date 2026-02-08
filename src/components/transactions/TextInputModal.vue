<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import AlertModal from '@/components/ui/AlertModal.vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { parseTextInput, type TextParseResult } from '@/utils/textParser'
import type { TransactionFormData } from '@/types/transaction'
import { useTransactions } from '@/composables/useTransactions'
import { MAIN_POCKET_ID } from '@/services/pocketService'
import { formatIDR } from '@/utils/currency'
import { usePaymentModalStore } from '@/stores/paymentModal'
import { useTokenStore } from '@/stores/token'
import { useI18n } from 'vue-i18n'
import idMessages from '@/i18n/id'

const { t, locale } = useI18n()

// Get placeholder: goals = income-only; pocket = general
const indonesianPlaceholder = computed(() => {
  if (props.lockedGoalId) {
    return idMessages.textInput.enterTransactionPlaceholderGoal
  }
  return idMessages.textInput.enterTransactionPlaceholder
})

interface Props {
  isOpen: boolean
  lockedPocketId?: string
  lockedGoalId?: string
  /** When provided, parent handles success toast + redirect to origin; this modal does not navigate. */
  originRoute?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  'edit-navigate': []
  'submit-complete': [payload?: { pocketId: string; amount: number; type: 'income' | 'expense' }]
}>()

const router = useRouter()
const paymentModalStore = usePaymentModalStore()
const tokenStore = useTokenStore()
const { createTransaction, fetchTransactions } = useTransactions()
const inputText = ref('')
const parseResult = ref<TextParseResult | null>(null)
const isProcessing = ref(false)
const showPreview = ref(false)
const isSubmitting = ref(false)
const showInsufficientBalanceModal = ref(false)
const insufficientBalanceMessage = ref('')
const limitError = ref<string | null>(null)
const showUsageGuide = ref(false) // Show/hide "Cara Menggunakan"
const showExamples = ref(false) // Show/hide "Contoh"
const showLimitInfo = ref(false)
const textareaRef = ref<HTMLTextAreaElement | null>(null)

const textUsageRemaining = computed(() => tokenStore.getRemainingUsage('text'))
const textUsageMax = computed(() => tokenStore.MAX_BASIC_USAGE)

// Goals: income-only examples. Pocket: general (income + expense)
const exampleTexts = computed(() => {
  if (props.lockedGoalId) {
    return [
      'Gaji masuk 5 juta',
      'Bonus bulan ini 2 juta',
      'Tabungan alokasi 500 ribu',
      'Transfer masuk dari bank 2 juta',
      'Hadiah 1 juta',
      'Freelance project 3 juta',
      'Return investasi 200 ribu',
    ]
  }
  return [
    'Beli bakso hari ini 20 ribu',
    'Gaji masuk 5 juta',
    'Bayar tagihan listrik kemarin 500rb',
    'Ngopi pagi ini 15k',
    'Transfer masuk dari bank 2 juta',
    'Beli dispenser 1 juta 520 ribu',
    'Belanja bulanan 2 juta 300 ribu',
    'Bensin motor puluh ribu',
    'Makan siang lima puluh ribu lima ratus',
    'Belanja di pasar seratus ribu',
  ]
})

function handleInput() {
  // Clear previous result when user types
  if (parseResult.value) {
    parseResult.value = null
    showPreview.value = false
  }
}

function handleParse() {
  if (!inputText.value.trim()) {
    return
  }

  // Check license/usage limit
  if (!tokenStore.canUseTextInput()) {
    limitError.value = t('textInput.limitReached', { max: tokenStore.MAX_BASIC_USAGE })
    return
  }

  limitError.value = null
  isProcessing.value = true

  // Simulate slight delay for better UX
  setTimeout(() => {
    const result = parseTextInput(inputText.value.trim(), props.lockedGoalId ? 'income' : undefined)
    parseResult.value = result
    showPreview.value = true
    isProcessing.value = false
  }, 300)
}

function handleEdit() {
  if (!parseResult.value || !parseResult.value.success) {
    console.warn('handleEdit: No valid parse result')
    return
  }

  const data = parseResult.value.data

  // Validate we have minimum required data
  if (!data.amount || data.amount <= 0) {
    console.warn('handleEdit: Invalid amount', data.amount)
    return
  }
  if (!data.description || !data.description.trim()) {
    console.warn('handleEdit: Invalid description', data.description)
    return
  }

  // Navigate directly to transaction form with prefilled data
  // NO popup, NO text input modal - direct navigation
  // Build query params object - Vue Router will handle encoding automatically
  const queryParams: Record<string, string> = {
    from: 'text-input',
  }
  if (props.originRoute) queryParams.returnTo = props.originRoute

  if (data.type) queryParams.type = data.type
  if (data.amount) queryParams.amount = data.amount.toString()
  if (data.description) queryParams.description = data.description.trim()
  if (data.category) queryParams.category = data.category
  if (data.date) queryParams.date = data.date
  if (props.lockedPocketId) queryParams.pocketId = props.lockedPocketId
  if (props.lockedGoalId) queryParams.goalId = props.lockedGoalId

  console.log('handleEdit: Navigating with query params:', queryParams)

  // CRITICAL: Close BOTH modals (TextInputModal and parent AddTransactionModal)
  // Emit signal to parent to close, then close self
  emit('edit-navigate')
  emit('close')

  // CRITICAL: Use nextTick to ensure modals are closed before navigation
  // Then use a small delay to ensure DOM is updated
  nextTick(() => {
    setTimeout(() => {
      const targetPath = '/transactions/new'
      console.log('handleEdit: Attempting navigation to', targetPath, 'with query:', queryParams)

      // Use router.push with explicit path and query
      // Ensure we're navigating to the correct path
      router.push({
        path: targetPath,
        query: queryParams,
      }).then(() => {
        console.log('handleEdit: Navigation successful to', router.currentRoute.value.path)
        // Verify we're on the correct route
        if (router.currentRoute.value.path !== targetPath) {
          console.warn('handleEdit: Navigation completed but route mismatch:', {
            expected: targetPath,
            actual: router.currentRoute.value.path
          })
        }
      }).catch((error) => {
        // Log navigation error for debugging
        console.error('handleEdit: Navigation error:', error)
        console.error('handleEdit: Error details:', {
          message: error.message,
          stack: error.stack,
          targetPath,
          queryParams,
          currentRoute: router.currentRoute.value.path
        })

        // Fallback: try again after a longer delay
        setTimeout(() => {
          console.log('handleEdit: Retrying navigation...')
          router.push({
            path: targetPath,
            query: queryParams,
          }).then(() => {
            console.log('handleEdit: Fallback navigation successful')
          }).catch((fallbackError) => {
            console.error('handleEdit: Fallback navigation also failed:', fallbackError)
          })
        }, 300)
      })
    }, 250) // Increased delay to ensure modals are fully closed and DOM is updated
  })
}

async function handleSubmit() {
  // CRITICAL: Only save when user explicitly clicks Submit
  // No auto-save, no background save, no draft save

  if (!parseResult.value || !parseResult.value.success) {
    return
  }

  const data = parseResult.value.data

  // Comprehensive validation before submission
  // Validate required fields
  if (!data.amount || data.amount <= 0) {
    console.warn('Submit blocked: Invalid amount')
    return
  }
  if (!data.description || !data.description.trim()) {
    console.warn('Submit blocked: Missing description')
    return
  }
  if (!data.category || data.category.trim() === '') {
    console.warn('Submit blocked: Missing category')
    return
  }
  if (!data.date || data.date.trim() === '') {
    console.warn('Submit blocked: Missing date')
    return
  }
  if (!data.type || (data.type !== 'income' && data.type !== 'expense')) {
    console.warn('Submit blocked: Invalid type')
    return
  }

  // At this point, all fields are validated and guaranteed to exist
  // TypeScript assertion: we know these are not undefined after validation
  const validatedAmount: number = data.amount
  const validatedDescription: string = data.description.trim()
  const validatedCategory: string = data.category.trim()
  const validatedType: 'income' | 'expense' = data.type

  // Additional validation: check date is not in future
  // At this point, data.date is guaranteed to exist due to validation above
  // Use non-null assertion since we validated it exists
  let finalDate: string = data.date!
  const transactionDate = new Date(finalDate)
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  if (transactionDate > today) {
    console.warn('Submit blocked: Date is in future, auto-correcting to today')
    // Auto-correct to today
    finalDate = new Date().toISOString().split('T')[0] as string
  }

  // Set submitting state to prevent double submission
  if (isSubmitting.value) {
    return // Already submitting, prevent double click
  }

  isSubmitting.value = true

  try {
    // Prepare transaction data with all validations passed
    // All fields are validated and guaranteed to be non-undefined
    const pocketId = props.lockedPocketId ?? MAIN_POCKET_ID
    const goalId = props.lockedGoalId
    // Goals can only receive income transactions
    if (goalId && validatedType !== 'income') {
      console.warn('Submit blocked: Goals can only receive income transactions')
      isSubmitting.value = false
      return
    }
    const transactionData: TransactionFormData = {
      type: validatedType,
      amount: validatedAmount,
      description: validatedDescription,
      category: validatedCategory,
      date: finalDate as string,
      pocketId,
      goalId,
    }

    await createTransaction(transactionData)
    await fetchTransactions()
    tokenStore.recordTextInput()
    const pl = props.originRoute
      ? { pocketId, amount: validatedAmount, type: validatedType as 'income' | 'expense' }
      : undefined
    emit('submit-complete', pl)
    emit('close')

    if (props.originRoute) {
      return
    }
    const dest = props.lockedPocketId ? `/pockets/${props.lockedPocketId}` : '/'
    const currentPath = router.currentRoute.value.path
    if (currentPath === dest) {
      setTimeout(() => window.dispatchEvent(new CustomEvent('check-transaction-notification')), 200)
    } else {
      setTimeout(() => router.push(dest), 150)
    }
  } catch (error: unknown) {
    const err = error as Error & { currentBalance?: number; amount?: number }
    if (err.message === 'INSUFFICIENT_POCKET_BALANCE' && err.currentBalance != null && err.amount != null) {
      insufficientBalanceMessage.value = t('pocket.insufficientBalanceMessage', {
        balance: formatIDR(err.currentBalance),
        amount: formatIDR(err.amount),
      })
      showInsufficientBalanceModal.value = true
    } else {
      console.error('Error creating transaction:', error)
    }
    isSubmitting.value = false
  }
}

function handleCancel() {
  inputText.value = ''
  parseResult.value = null
  showPreview.value = false
  isSubmitting.value = false
}

function handleExampleClick(example: string) {
  inputText.value = example
  handleParse()
}

/** Reset all state so modal always starts empty. No pre-filled or "detected" data. */
function resetState() {
  inputText.value = ''
  parseResult.value = null
  showPreview.value = false
  isProcessing.value = false
  isSubmitting.value = false
  showUsageGuide.value = false
  showExamples.value = false
  limitError.value = null
}

function handleClose() {
  resetState()
  emit('close')
}

// Navigate to profile and close modal
function onActivateLicense() {
  showLimitInfo.value = false
  paymentModalStore.openPaymentModal()
}


// Reset when modal opens so we always start empty. Prevents "sudah langsung ke detect" bug.
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    resetState()
    nextTick(() => textareaRef.value?.focus())
  }
}, { immediate: true })

const hasErrors = computed(() => {
  return parseResult.value?.errors && parseResult.value.errors.length > 0
})

const canSubmit = computed(() => {
  if (!parseResult.value?.success) return false
  const data = parseResult.value.data
  return !!(
    data.amount &&
    data.amount > 0 &&
    data.description &&
    data.description.trim() &&
    data.category &&
    data.date
  )
})

</script>

<template>
  <BottomSheet :is-open="isOpen" :title="showPreview ? t('textInput.previewTitle') : t('textInput.title')"
    maxHeight="85" @close="handleClose">
    <template #header-actions>
      <button v-if="!tokenStore.isLicenseActive" type="button" @click="showLimitInfo = true"
        class="flex shrink-0 items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0 text-xs font-medium text-amber-800 shadow-sm transition-colors hover:bg-amber-100 hover:border-amber-300 dark:border-amber-700 dark:bg-amber-900/25 dark:text-amber-200 dark:hover:bg-amber-900/40"
        :aria-label="t('textInput.usageLabelTap')" :title="t('textInput.usageLabelTap')">
        <font-awesome-icon :icon="['fas', 'circle-info']" class="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
        <span class="tabular-nums">{{ t('textInput.usageLabel', { remaining: textUsageRemaining, max: textUsageMax })
        }}</span>

      </button>
    </template>
    <div class="space-y-4 py-2">
      <!-- Input Section -->
      <div v-if="!showPreview" class="space-y-4">
        <!-- Usage Limit Warning (Moved to Header) -->

        <!-- Limit Error -->
        <div v-if="limitError"
          class="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
          <p class="text-xs text-red-800 dark:text-red-300">{{ limitError }}</p>
        </div>

        <!-- Helper Text - Collapsible -->
        <div
          class="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 overflow-hidden">
          <button type="button" @click="showUsageGuide = !showUsageGuide"
            class="w-full flex items-center justify-between p-4 text-left hover:bg-blue-100/50 dark:hover:bg-blue-900/30 transition-colors">
            <div class="flex items-center gap-3">
              <div class="flex-shrink-0">
                <font-awesome-icon :icon="['fas', 'lightbulb']" class="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <p class="text-sm font-medium text-blue-900 dark:text-blue-200">
                {{ t('textInput.howToUse') }}
              </p>
            </div>
            <font-awesome-icon :icon="['fas', showUsageGuide ? 'chevron-up' : 'chevron-down']"
              class="h-4 w-4 text-blue-600 dark:text-blue-400 transition-transform" />
          </button>
          <Transition enter-active-class="transition-all duration-200 ease-out" enter-from-class="opacity-0 max-h-0"
            enter-to-class="opacity-100 max-h-32" leave-active-class="transition-all duration-200 ease-in"
            leave-from-class="opacity-100 max-h-32" leave-to-class="opacity-0 max-h-0">
            <div v-show="showUsageGuide" class="px-4 pb-4 pt-0 overflow-hidden">
              <p class="text-xs text-blue-700 dark:text-blue-300">
                {{ props.lockedGoalId ? t('textInput.howToUseDescGoal') : t('textInput.howToUseDesc') }}
              </p>
            </div>
          </Transition>
        </div>

        <!-- Input Field - Enhanced UI/UX -->
        <div class="space-y-2">
          <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300">
            {{ t('textInput.enterTransaction') }}
          </label>
          <div class="relative">
            <textarea ref="textareaRef" v-model="inputText" :placeholder="indonesianPlaceholder" rows="8"
              class="w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3.5 text-base text-slate-900 placeholder:text-slate-400 transition-all duration-200 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-brand dark:focus:ring-brand/20 resize-none shadow-sm focus:shadow-md"
              @input="handleInput" @keydown.ctrl.enter.exact.prevent="handleParse"
              @keydown.meta.enter.exact.prevent="handleParse" />
            <div v-if="inputText.trim()" class="absolute bottom-2 right-2 text-xs text-slate-400 dark:text-slate-500">
              {{ inputText.length }} {{ t('textInput.characters') }}
            </div>
          </div>
          <!-- <p class="text-xs text-slate-500 dark:text-slate-400">
            Tekan <kbd class="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-xs font-mono">Ctrl+Enter</kbd>
            atau <kbd class="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-xs font-mono">Cmd+Enter</kbd>
            untuk
            melanjutkan
          </p> -->
        </div>

        <!-- Example Texts - Collapsible -->
        <div class="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <button type="button" @click="showExamples = !showExamples"
            class="w-full flex items-center justify-between p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
            <div class="flex items-center gap-2">
              <font-awesome-icon :icon="['fas', 'lightbulb']" class="h-4 w-4 text-slate-500 dark:text-slate-400" />
              <p class="text-sm font-medium text-slate-700 dark:text-slate-300">
                {{ t('textInput.seeExamples') }}
              </p>
            </div>
            <font-awesome-icon :icon="['fas', showExamples ? 'chevron-up' : 'chevron-down']"
              class="h-4 w-4 text-slate-500 dark:text-slate-400 transition-transform" />
          </button>
          <Transition enter-active-class="transition-all duration-200 ease-out" enter-from-class="opacity-0 max-h-0"
            enter-to-class="opacity-100 max-h-96" leave-active-class="transition-all duration-200 ease-in"
            leave-from-class="opacity-100 max-h-96" leave-to-class="opacity-0 max-h-0">
            <div v-show="showExamples" class="px-3 pb-3 pt-0 overflow-hidden">
              <div class="flex flex-wrap gap-2 pt-2">
                <button v-for="(example, index) in exampleTexts" :key="index" type="button"
                  @click="handleExampleClick(example)"
                  class="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:border-brand hover:bg-brand/5 dark:hover:bg-brand/10 transition-colors">
                  {{ example }}
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </div>

      <!-- Preview Section -->
      <div v-else class="space-y-4">
        <!-- Errors -->
        <div v-if="hasErrors"
          class="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
          <div class="flex items-start gap-3">
            <div class="flex-shrink-0 mt-0.5">
              <font-awesome-icon :icon="['fas', 'exclamation-circle']" class="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-red-900 dark:text-red-200 mb-2">
                {{ t('textInput.errors') }}
              </p>
              <ul class="space-y-1">
                <li v-for="(error, index) in parseResult?.errors" :key="index"
                  class="text-xs text-red-700 dark:text-red-300">
                  • {{ error }}
                </li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Combined Success Card with Warnings -->
        <div v-if="parseResult?.success" class="space-y-4">
          <div class="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4">
            <div class="flex items-start gap-3">
              <div class="flex-shrink-0 mt-0.5">
                <font-awesome-icon :icon="['fas', 'check-circle']" class="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div class="flex-1 min-w-0 space-y-2">
                <div>
                  <p class="text-sm font-medium text-green-900 dark:text-green-200 mb-1">
                    {{ t('textInput.parseSuccess') }}
                  </p>
                  <p class="text-xs text-green-700 dark:text-green-300">
                    {{ t('textInput.parseSuccessDesc') }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Parsed Data Preview -->
          <BaseCard>
            <div class="space-y-4">
              <h4 class="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
                {{ t('textInput.transactionDetails') }}
              </h4>

              <!-- Type -->
              <div>
                <p class="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  {{ t('textInput.type') }}
                </p>
                <span :class="[
                  'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
                  parseResult.data.type === 'income'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
                ]">
                  {{ parseResult.data.type === 'income' ? t('textInput.income') : t('textInput.expense') }}
                </span>
              </div>

              <!-- Amount -->
              <div>
                <p class="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  {{ t('textInput.amount') }}
                </p>
                <p class="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {{ formatIDR(parseResult.data.amount || 0) }}
                </p>
              </div>

              <!-- Description -->
              <div>
                <p class="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  {{ t('textInput.description') }}
                </p>
                <p class="text-sm text-slate-900 dark:text-slate-100">
                  {{ parseResult.data.description || '-' }}
                </p>
              </div>

              <!-- Category -->
              <div>
                <p class="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  {{ t('textInput.category') }}
                </p>
                <p class="text-sm text-slate-900 dark:text-slate-100">
                  {{ parseResult.data.category || '-' }}
                </p>
              </div>

              <!-- Date -->
              <div>
                <p class="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  {{ t('textInput.date') }}
                </p>
                <p class="text-sm text-slate-900 dark:text-slate-100">
                  {{
                    parseResult.data.date
                      ? new Date(parseResult.data.date).toLocaleDateString(locale === 'id' ? 'id-ID' : 'en-US', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })
                      : '-'
                  }}
                </p>
              </div>
            </div>
          </BaseCard>

          <!-- Action Buttons -->
          <div class="flex flex-col gap-2 pt-2">
            <div class="flex justify-end gap-2">

              <BaseButton variant="secondary" @click="handleEdit" class="w-full">
                <font-awesome-icon :icon="['fas', 'edit']" class="mr-2" />
                {{ t('textInput.edit') }}
              </BaseButton>
              <BaseButton @click="handleSubmit" :disabled="!canSubmit" :loading="isSubmitting" class="w-full" size="lg">
                <font-awesome-icon :icon="['fas', 'check']" class="mr-2" />
                {{ t('textInput.save') }}
              </BaseButton>
            </div>
            <BaseButton variant="danger" @click="handleCancel" class="w-full">
              <font-awesome-icon :icon="['fas', 'times']" class="mr-2" />
              {{ t('textInput.cancel') }}
            </BaseButton>
          </div>
        </div>

        <!-- Failed Parse -->
        <div v-else class="space-y-4">
          <div class="rounded-lg bg-slate-100 dark:bg-slate-800/50 p-4 text-center">
            <p class="text-sm text-slate-700 dark:text-slate-300 mb-2">
              {{ t('textInput.parseFailed') }}
            </p>
            <p class="text-xs text-slate-500 dark:text-slate-400 mb-4">
              {{ t('textInput.parseFailedDesc') }}
            </p>
            <BaseButton variant="secondary" @click="handleCancel" class="w-full">
              <font-awesome-icon :icon="['fas', 'redo']" class="mr-2" />
              {{ t('textInput.tryAgain') }}
            </BaseButton>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div v-if="!showPreview" class="space-y-3">
        <!-- Footer Buttons -->
        <div class="flex items-center justify-between gap-3">
          <BaseButton variant="secondary" @click="handleClose">
            {{ t('textInput.close') }}
          </BaseButton>
          <BaseButton @click="handleParse" :loading="isProcessing" :disabled="!inputText.trim()">
            <font-awesome-icon :icon="['fas', 'magic']" class="mr-2" />
            {{ t('textInput.continue') }}
          </BaseButton>
        </div>
      </div>
    </template>
  </BottomSheet>

  <!-- Limit Info Modal -->
  <BottomSheet :is-open="showLimitInfo" :title="t('textInput.basicAccountLimit')" @close="showLimitInfo = false"
    maxHeight="60">
    <div class="space-y-4">
      <div class="flex flex-col items-center justify-center py-0 text-center">
        <!-- Grayscale Crown Icon -->
        <div class="mb-4 rounded-full bg-slate-100 p-3 dark:bg-slate-800">
          <font-awesome-icon :icon="['fas', 'crown']" class="h-6 w-6 text-slate-400" />
        </div>
        <h3 class="mb-2 text-lg font-bold text-slate-900 dark:text-slate-100">
          {{ t('textInput.basicAccountLimit') }}
        </h3>
        <p class="text-sm text-slate-600 dark:text-slate-400 max-w-xs mx-auto">
          {{ t('textInput.basicAccountLimitDesc', {
            remaining: tokenStore.getRemainingUsage('text'),
            max: tokenStore.MAX_BASIC_USAGE
          }) }}
        </p>
      </div>

      <!-- <div class="rounded-lg bg-amber-50 p-4 dark:bg-amber-900/20">
        <div class="flex gap-3">
          <font-awesome-icon :icon="['fas', 'check-circle']"
            class="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <h4 class="font-medium text-amber-900 dark:text-amber-200">{{ t('textInput.activateLicenseForUnlimited') }}
            </h4>
            <p class="mt-1 text-sm text-amber-800 dark:text-amber-300">
              {{ t('textInput.premiumBenefits') }}
            </p>
          </div>
        </div>
      </div> -->

      <div class="pt-2">
        <BaseButton class="w-full justify-center" size="lg" @click="onActivateLicense">
          <font-awesome-icon :icon="['fas', 'crown']" class="mr-2" />
          {{ t('textInput.activateLicense') }}
        </BaseButton>
      </div>
    </div>
  </BottomSheet>

  <AlertModal :is-open="showInsufficientBalanceModal" :title="t('pocket.insufficientBalanceTitle')"
    :message="insufficientBalanceMessage" variant="warning" @close="showInsufficientBalanceModal = false" />
</template>
