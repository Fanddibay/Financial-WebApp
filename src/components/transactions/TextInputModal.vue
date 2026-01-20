<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { parseTextInput, type TextParseResult } from '@/utils/textParser'
import type { TransactionFormData } from '@/types/transaction'
import { useTransactions } from '@/composables/useTransactions'
import { formatIDR } from '@/utils/currency'
import { useTokenStore } from '@/stores/token'
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()

interface Props {
  isOpen: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  'edit-navigate': [] // Signal to parent that we're navigating to edit
  'submit-complete': [] // Signal to parent that submit is complete and modal should close
}>()

const router = useRouter()
const tokenStore = useTokenStore()
const { createTransaction, fetchTransactions } = useTransactions()
const inputText = ref('')
const parseResult = ref<TextParseResult | null>(null)
const isProcessing = ref(false)
const showPreview = ref(false)
const isSubmitting = ref(false)
const showWarnings = ref(true)
const limitError = ref<string | null>(null)
const showUsageGuide = ref(false) // Show/hide "Cara Menggunakan"
const showExamples = ref(false) // Show/hide "Contoh"
const textareaRef = ref<HTMLTextAreaElement | null>(null)

const exampleTexts = computed(() => {
  if (locale.value === 'id') {
    return [
      'Beli bakso hari ini 20 ribu',
      'Gaji masuk 5 juta',
      'Bayar tagihan listrik kemarin 500rb',
      'Ngopi pagi ini 15k',
      'Transfer masuk dari bank 2 juta',
      'Beli dispenser 1 juta 520 ribu',
      'Belanja bulanan 2 juta 300 ribu',
    ]
  } else {
    return [
      'Buy lunch today 20 thousand',
      'Salary received 5 million',
      'Pay electricity bill yesterday 500k',
      'Coffee this morning 15k',
      'Bank transfer received 2 million',
      'Buy dispenser 1 million 520 thousand',
      'Monthly shopping 2 million 300 thousand',
    ]
  }
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
  showWarnings.value = true // Reset to show warnings by default

  // Simulate slight delay for better UX
  setTimeout(() => {
    const result = parseTextInput(inputText.value.trim())
    parseResult.value = result
    showPreview.value = true
    isProcessing.value = false
  }, 300)
}

function handleEdit() {
  if (!parseResult.value || !parseResult.value.success) {
    return
  }

  const data = parseResult.value.data

  // Validate we have minimum required data
  if (!data.amount || data.amount <= 0) {
    return
  }
  if (!data.description || !data.description.trim()) {
    return
  }

  // Navigate directly to transaction form with prefilled data
  // NO popup, NO text input modal - direct navigation
  const queryParams = new URLSearchParams()
  if (data.type) queryParams.set('type', data.type)
  if (data.amount) queryParams.set('amount', data.amount.toString())
  if (data.description) queryParams.set('description', encodeURIComponent(data.description.trim()))
  if (data.category) queryParams.set('category', encodeURIComponent(data.category))
  if (data.date) queryParams.set('date', data.date)
  queryParams.set('from', 'text-input')

  // CRITICAL: Close BOTH modals (TextInputModal and parent AddTransactionModal)
  // Emit signal to parent to close, then close self
  emit('edit-navigate')
  emit('close')

  // Small delay to ensure ALL modals are fully closed before navigation
  setTimeout(() => {
    router.push({
      path: '/transactions/new',
      query: Object.fromEntries(queryParams),
    })
  }, 150)
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
    const transactionData: TransactionFormData = {
      type: validatedType,
      amount: validatedAmount,
      description: validatedDescription,
      category: validatedCategory,
      date: finalDate as string, // Type assertion: validated above
    }

    // ONLY save here - no auto-save anywhere else
    const transaction = await createTransaction(transactionData)
    await fetchTransactions()

    // Store transaction data for notification (only after successful save)
    sessionStorage.setItem('newTransaction', JSON.stringify({
      type: transaction.type,
      amount: transaction.amount,
      description: transaction.description,
      category: transaction.category,
      date: transaction.date,
    }))

    // CRITICAL: Set sessionStorage BEFORE closing modals and navigating
    // This ensures HomeView can read it immediately when it mounts/updates

    // CRITICAL: Close BOTH modals (TextInputModal and parent AddTransactionModal)
    // Emit signal to parent to close, then close self
    // Record usage
    tokenStore.recordTextInput()
    emit('submit-complete')
    emit('close')

    // Check if we're already on homepage
    const currentPath = router.currentRoute.value.path
    const isOnHomepage = currentPath === '/'

    if (isOnHomepage) {
      // If already on homepage, don't navigate (wouldn't trigger watcher anyway)
      // Instead, trigger notification check directly after modals close
      setTimeout(() => {
        // Trigger a custom event that HomeView can listen to
        // This will immediately check sessionStorage and show notification
        window.dispatchEvent(new CustomEvent('check-transaction-notification'))
      }, 200)
    } else {
      // If not on homepage, navigate normally
      setTimeout(() => {
        router.push('/')
      }, 150)
    }
  } catch (error) {
    console.error('Error creating transaction:', error)
    isSubmitting.value = false
    // Reset submitting state on error so user can retry
  }
}

function handleCancel() {
  // CRITICAL: Cancel must completely discard all data
  // No auto-save, no draft, no background submit
  // Reset all state and go back to input screen

  // Clear all parsed data
  parseResult.value = null
  showPreview.value = false
  showWarnings.value = true
  isSubmitting.value = false

  // Optionally clear input text too (user can start fresh)
  // inputText.value = '' // Uncomment if you want to clear input on cancel
}

function handleExampleClick(example: string) {
  inputText.value = example
  handleParse()
}

function handleClose() {
  // CRITICAL: When closing modal, completely reset all state
  // This ensures no data persists or gets auto-saved

  inputText.value = ''
  parseResult.value = null
  showPreview.value = false
  isProcessing.value = false
  isSubmitting.value = false
  showWarnings.value = true
  showUsageGuide.value = false // Reset to default closed
  showExamples.value = false // Reset to default closed

  // Emit close event
  emit('close')
}


// Auto-focus textarea when modal opens
watch(() => props.isOpen, (isOpen) => {
  if (isOpen && !showPreview.value) {
    nextTick(() => {
      textareaRef.value?.focus()
    })
  }
})

const hasErrors = computed(() => {
  return parseResult.value?.errors && parseResult.value.errors.length > 0
})

const hasWarnings = computed(() => {
  return parseResult.value?.warnings && parseResult.value.warnings.length > 0
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

const hasLowConfidenceFields = computed(() => {
  if (!parseResult.value) return false
  const conf = parseResult.value.confidence
  return (
    conf.amount === 'low' ||
    conf.amount === 'none' ||
    conf.type === 'low' ||
    conf.type === 'none' ||
    conf.category === 'low' ||
    conf.category === 'none' ||
    conf.date === 'low' ||
    conf.date === 'none'
  )
})

const confidenceLabels = {
  high: t('textInput.confidenceHigh'),
  medium: t('textInput.confidenceMedium'),
  low: t('textInput.confidenceLow'),
  none: t('textInput.confidenceNone'),
}

const confidenceColors = {
  high: 'text-green-600 dark:text-green-400',
  medium: 'text-yellow-600 dark:text-yellow-400',
  low: 'text-orange-600 dark:text-orange-400',
  none: 'text-red-600 dark:text-red-400',
}

function getFieldStatus(field: 'amount' | 'type' | 'category' | 'date') {
  if (!parseResult.value) return 'none'
  return parseResult.value.confidence[field]
}
</script>

<template>
  <BaseModal :is-open="isOpen" :title="showPreview ? t('textInput.previewTitle') : t('textInput.title')" size="md"
    @close="handleClose">
    <div class="space-y-4 py-2">
      <!-- Input Section -->
      <div v-if="!showPreview" class="space-y-4">
        <!-- Usage Limit Warning -->
        <div v-if="!tokenStore.isLicenseActive"
          class="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3">
          <div class="flex items-start gap-2">
            <font-awesome-icon :icon="['fas', 'info-circle']"
              class="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div class="flex-1">
              <p class="text-xs font-medium text-amber-800 dark:text-amber-300 mb-0.5">
                {{ t('textInput.basicAccountLimit') }}
              </p>
              <p class="text-xs text-amber-700 dark:text-amber-400">
                {{ t('textInput.basicAccountLimitDesc', {
                  remaining: tokenStore.getRemainingUsage('text'), max:
                    tokenStore.MAX_BASIC_USAGE }) }}
                <button @click="router.push('/profile')" class="underline font-medium">{{ t('textInput.activateLicense')
                  }}</button> {{ t('textInput.activateLicenseForUnlimited') }}
              </p>
            </div>
          </div>
        </div>

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
                {{ t('textInput.howToUseDesc') }}
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
            <textarea ref="textareaRef" v-model="inputText" :placeholder="t('textInput.enterTransactionPlaceholder')"
              rows="8"
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

                <!-- Warnings & Low Confidence Section (if any) -->
                <div v-if="hasWarnings || hasLowConfidenceFields"
                  class="mt-3 pt-3 border-t border-green-200 dark:border-green-700">
                  <!-- Toggle Button -->
                  <button type="button" @click="showWarnings = !showWarnings"
                    class="w-full flex items-center justify-between text-left text-xs font-medium text-green-800 dark:text-green-200 hover:text-green-900 dark:hover:text-green-100 transition-colors mb-2">
                    <span class="flex items-center gap-1.5">
                      <font-awesome-icon :icon="['fas', showWarnings ? 'chevron-down' : 'chevron-right']"
                        class="h-3 w-3 transition-transform" />
                      <span v-if="hasWarnings && hasLowConfidenceFields">
                        {{ t('textInput.warningsAndInfo') }} ({{ parseResult?.warnings?.length || 0 }})
                      </span>
                      <span v-else-if="hasWarnings">
                        {{ t('textInput.warningsCount', { count: parseResult?.warnings?.length || 0 }) }}
                      </span>
                      <span v-else>
                        {{ t('textInput.lowConfidenceInfo') }}
                      </span>
                    </span>
                  </button>

                  <!-- Collapsible Content -->
                  <Transition enter-active-class="transition-all duration-200 ease-out"
                    enter-from-class="opacity-0 max-h-0" enter-to-class="opacity-100 max-h-96"
                    leave-active-class="transition-all duration-200 ease-in" leave-from-class="opacity-100 max-h-96"
                    leave-to-class="opacity-0 max-h-0">
                    <div v-show="showWarnings" class="space-y-2 overflow-hidden">
                      <!-- Warnings List -->
                      <div v-if="hasWarnings">
                        <p
                          class="text-xs font-medium text-yellow-800 dark:text-yellow-200 mb-1.5 flex items-center gap-1.5">
                          <font-awesome-icon :icon="['fas', 'exclamation-triangle']" class="h-3.5 w-3.5" />
                          {{ t('textInput.warnings') }}:
                        </p>
                        <ul class="space-y-1 ml-5">
                          <li v-for="(warning, index) in parseResult?.warnings" :key="index"
                            class="text-xs text-yellow-700 dark:text-yellow-300">
                            • {{ warning }}
                          </li>
                        </ul>
                      </div>

                      <!-- Low Confidence Info -->
                      <div v-if="hasLowConfidenceFields" class="text-xs">
                        <p class="font-medium text-orange-800 dark:text-orange-200 mb-1 flex items-center gap-1.5">
                          <font-awesome-icon :icon="['fas', 'info-circle']" class="h-3.5 w-3.5" />
                          {{ t('textInput.lowConfidenceFields') }}
                        </p>
                        <p class="text-orange-700 dark:text-orange-300 ml-5">
                          {{ t('textInput.lowConfidenceDesc') }}
                        </p>
                      </div>
                    </div>
                  </Transition>
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
                  <span v-if="getFieldStatus('type') === 'low' || getFieldStatus('type') === 'none'"
                    class="ml-1 text-orange-600 dark:text-orange-400">
                    ⚠️
                  </span>
                </p>
                <div class="flex items-center gap-2">
                  <span :class="[
                    'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
                    parseResult.data.type === 'income'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
                    (getFieldStatus('type') === 'low' || getFieldStatus('type') === 'none') && 'ring-2 ring-orange-300 dark:ring-orange-700',
                  ]">
                    {{ parseResult.data.type === 'income' ? t('textInput.income') : t('textInput.expense') }}
                  </span>
                  <span :class="['text-xs', confidenceColors[getFieldStatus('type')]]">
                    ({{ confidenceLabels[getFieldStatus('type')] }})
                  </span>
                </div>
              </div>

              <!-- Amount -->
              <div>
                <p class="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  {{ t('textInput.amount') }}
                  <span v-if="getFieldStatus('amount') === 'low' || getFieldStatus('amount') === 'none'"
                    class="ml-1 text-orange-600 dark:text-orange-400">
                    ⚠️
                  </span>
                </p>
                <div class="flex items-center gap-2">
                  <p :class="[
                    'text-lg font-bold text-slate-900 dark:text-slate-100',
                    (getFieldStatus('amount') === 'low' || getFieldStatus('amount') === 'none') && 'ring-2 ring-orange-300 dark:ring-orange-700 rounded px-2 py-1',
                  ]">
                    {{ formatIDR(parseResult.data.amount || 0) }}
                  </p>
                  <span :class="['text-xs', confidenceColors[getFieldStatus('amount')]]">
                    ({{ confidenceLabels[getFieldStatus('amount')] }})
                  </span>
                </div>
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
                  <span v-if="getFieldStatus('category') === 'low' || getFieldStatus('category') === 'none'"
                    class="ml-1 text-orange-600 dark:text-orange-400">
                    ⚠️
                  </span>
                </p>
                <div class="flex items-center gap-2">
                  <p :class="[
                    'text-sm text-slate-900 dark:text-slate-100',
                    (getFieldStatus('category') === 'low' || getFieldStatus('category') === 'none') && 'ring-2 ring-orange-300 dark:ring-orange-700 rounded px-2 py-1',
                  ]">
                    {{ parseResult.data.category || '-' }}
                  </p>
                  <span :class="['text-xs', confidenceColors[getFieldStatus('category')]]">
                    ({{ confidenceLabels[getFieldStatus('category')] }})
                  </span>
                </div>
              </div>

              <!-- Date -->
              <div>
                <p class="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  {{ t('textInput.date') }}
                  <span v-if="getFieldStatus('date') === 'low' || getFieldStatus('date') === 'none'"
                    class="ml-1 text-orange-600 dark:text-orange-400">
                    ⚠️
                  </span>
                </p>
                <div class="flex items-center gap-2">
                  <p :class="[
                    'text-sm text-slate-900 dark:text-slate-100',
                    (getFieldStatus('date') === 'low' || getFieldStatus('date') === 'none') && 'ring-2 ring-orange-300 dark:ring-orange-700 rounded px-2 py-1',
                  ]">
                    {{
                      parseResult.data.date
                        ? new Date(parseResult.data.date).toLocaleDateString(locale.value === 'id' ? 'id-ID' : 'en-US', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })
                        : '-'
                    }}
                  </p>
                  <span :class="['text-xs', confidenceColors[getFieldStatus('date')]]">
                    ({{ confidenceLabels[getFieldStatus('date')] }})
                  </span>
                </div>
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
  </BaseModal>
</template>
