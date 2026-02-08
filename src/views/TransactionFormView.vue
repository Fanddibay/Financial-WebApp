<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTransactions } from '@/composables/useTransactions'
import { useAddTransactionFlow } from '@/composables/useAddTransactionFlow'
import { useToastStore } from '@/stores/toast'
import { usePocketStore } from '@/stores/pocket'
import { useGoalStore } from '@/stores/goal'
import { MAIN_POCKET_ID } from '@/services/pocketService'
import type { TransactionFormData } from '@/types/transaction'
import TransactionForm from '@/components/transactions/TransactionForm.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import AlertModal from '@/components/ui/AlertModal.vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import { useTokenStore } from '@/stores/token'
import { usePaymentModalStore } from '@/stores/paymentModal'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { formatIDR } from '@/utils/currency'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const route = useRoute()
const router = useRouter()
const toastStore = useToastStore()
const pocketStore = usePocketStore()
const goalStore = useGoalStore()
const tokenStore = useTokenStore()
const paymentModalStore = usePaymentModalStore()
const { successThenRedirect } = useAddTransactionFlow()
const { categories, loading, fetchTransactions, createTransaction, updateTransaction, getTransactionById } = useTransactions()

const isEdit = computed(() => route.name === 'transaction-edit')
const transactionId = computed((): string => {
  const id = route.params.id
  if (typeof id === 'string') {
    return id
  }
  if (Array.isArray(id) && id.length > 0 && typeof id[0] === 'string') {
    return id[0]
  }
  return ''
})

interface PendingTransaction extends TransactionFormData {
  tempId: string
}

const formData = ref<TransactionFormData>({
  type: 'expense',
  amount: 0,
  description: '',
  category: '',
  date: getTodayDate(),
  pocketId: MAIN_POCKET_ID,
  goalId: undefined,
})

const isFromTextInput = ref(false)
const fromPocketId = ref<string | null>(null)
const returnTo = ref('')
const isCancelling = ref(false)

const pendingTransactions = ref<PendingTransaction[]>([])
const editingIndex = ref<number | null>(null)
const showDeleteConfirm = ref(false)
const showCancelConfirm = ref(false)
const transactionIndexToDelete = ref<number | null>(null)
const openActionIndex = ref<number | null>(null)

function closeActionMenu() {
  openActionIndex.value = null
}

watch(openActionIndex, (val) => {
  if (val !== null) {
    nextTick(() => {
      document.addEventListener('click', closeActionMenu, { once: true })
    })
  }
})
onUnmounted(() => {
  document.removeEventListener('click', closeActionMenu)
})
const showManualFormUpgradeModal = ref(false)

const manualFormRemaining = computed(() => tokenStore.getRemainingUsage('manualForm'))
const manualFormMax = computed(() => tokenStore.MAX_MANUAL_FORM_BASIC)

// Alert modal state
const showAlert = ref(false)
const alertTitle = ref('Pemberitahuan')
const alertMessage = ref('')
const alertVariant = ref<'error' | 'warning' | 'info' | 'success'>('error')

function showAlertModal(title: string, message: string, variant: 'error' | 'warning' | 'info' | 'success' = 'error') {
  alertTitle.value = title
  alertMessage.value = message
  alertVariant.value = variant
  showAlert.value = true
}

function getTodayDate(): string {
  const dateStr = new Date().toISOString().split('T')[0]
  return dateStr || new Date().toLocaleDateString('en-CA') // Fallback to YYYY-MM-DD format
}

const defaultFormData: TransactionFormData = {
  type: 'expense',
  amount: 0,
  description: '',
  category: '',
  date: getTodayDate(),
  pocketId: MAIN_POCKET_ID,
  goalId: undefined,
}

const pocketOptions = computed(() =>
  pocketStore.pockets.map((p) => ({ value: p.id, label: `${p.icon} ${p.name}` })),
)
const lockedPocketId = computed(() => fromPocketId.value ?? undefined)

/** Saat pilih pocket tabungan: default type income, rincian ke option 1 (Gaji). */
function applySavingPocketDefaults() {
  const pocket = pocketStore.getPocketById(formData.value.pocketId)
  if (pocket?.type === 'saving') {
    formData.value.type = 'income'
    formData.value.category = t('transaction.categorySalary')
  }
}

/** Pengeluaran/income tanpa kategori: isi option 1 sebagai default. */
function applyDefaultCategory() {
  if (formData.value.category) return
  formData.value.category =
    formData.value.type === 'income'
      ? t('transaction.categorySalary')
      : t('transaction.categoryFood')
}

watch(
  () => formData.value.pocketId,
  () => {
    applySavingPocketDefaults()
    applyDefaultCategory()
  },
)
watch(
  () => formData.value.type,
  () => applyDefaultCategory(),
)

onMounted(async () => {
  pocketStore.fetchPockets()
  goalStore.fetchGoals()
  if (isEdit.value) {
    const id = transactionId.value
    if (!id) {
      router.push('/transactions')
      return
    }
    await fetchTransactions()
    const transaction = getTransactionById(id)
    if (transaction) {
      if (transaction.type === 'transfer') {
        router.replace('/transactions')
        return
      }
      formData.value = {
        type: transaction.type as 'income' | 'expense',
        amount: transaction.amount,
        description: transaction.description,
        category: transaction.category,
        date: transaction.date,
        pocketId: transaction.pocketId,
        goalId: transaction.goalId,
      }
      // If editing a goal transaction that is income, prevent changing to expense
      if (transaction.goalId && transaction.type === 'income') {
        // Type will be locked in TransactionForm component
      }
    } else {
      router.push('/transactions')
    }
  } else {
    const query = route.query
    if (typeof query.returnTo === 'string' && query.returnTo) returnTo.value = query.returnTo
    if (query.pocketId && typeof query.pocketId === 'string') {
      formData.value.pocketId = query.pocketId
      fromPocketId.value = query.pocketId
      applySavingPocketDefaults()
    }
    // Handle goalId - goals can only receive income; redirect back to goal after save
    if (query.goalId && typeof query.goalId === 'string') {
      formData.value.goalId = query.goalId
      formData.value.type = 'income' // Force income for goals
      if (!returnTo.value) returnTo.value = `/goals/${query.goalId}`
      // Set default category for goal income
      if (!formData.value.category) {
        formData.value.category = t('transaction.categorySalary')
      }
    }
    applyDefaultCategory()
    if (query.from === 'text-input') {
      isFromTextInput.value = true
      // For goals, force income type even from text input
      if (query.goalId && typeof query.goalId === 'string') {
        formData.value.goalId = query.goalId
        formData.value.type = 'income' // Force income for goals
      } else if (query.type) {
        formData.value.type = query.type as 'income' | 'expense'
      }
      if (query.amount) {
        const amount = parseFloat(query.amount as string)
        if (!isNaN(amount) && amount > 0) formData.value.amount = amount
      }
      if (query.description) formData.value.description = decodeURIComponent(query.description as string)
      if (query.category) formData.value.category = decodeURIComponent(query.category as string)
      if (query.date) formData.value.date = query.date as string
    }
    router.replace({ query: {} }).catch(() => { })
  }
})

// Helper function to check if date is in the future
function isDateInFuture(dateString: string): boolean {
  if (!dateString) return false
  const date = new Date(dateString)
  const today = new Date()
  today.setHours(23, 59, 59, 999) // End of today
  return date > today
}

function validateForm(data: TransactionFormData): string | null {
  if (!data.description.trim()) {
    return t('transaction.descriptionRequired')
  }
  if (data.amount <= 0) {
    return t('transaction.amountRequired')
  }
  if (!data.category) {
    return t('transaction.categoryRequired')
  }
  if (!data.date) {
    return t('transaction.dateRequired')
  }
  if (isDateInFuture(data.date)) {
    return t('transaction.dateFutureError')
  }
  // Goals can only receive income transactions
  if (data.goalId && data.type !== 'income') {
    return t('goal.onlyIncomeAllowed')
  }
  return null
}

async function handleSubmit() {
  // CRITICAL: Don't save if user is canceling
  if (isCancelling.value) {
    return
  }

  // Final date validation before submission
  if (formData.value.date && isDateInFuture(formData.value.date)) {
    showAlertModal(
      t('transaction.dateInvalid'),
      t('transaction.dateInvalidDesc'),
      'warning'
    )
    // Auto-correct to today
    formData.value.date = getTodayDate()
    return
  }

  const error = validateForm(formData.value)
  if (error) {
    showAlertModal(t('transaction.validationFailed'), error, 'warning')
    return
  }

  if (!isEdit.value && !tokenStore.canUseManualForm()) {
    showManualFormUpgradeModal.value = true
    return
  }

  try {
    if (isEdit.value) {
      const id = transactionId.value
      if (!id) return
      await updateTransaction(id, formData.value)
      toastStore.success(t('transaction.updateSuccess'))
      router.push(returnTo.value || '/')
    } else {
      await createTransaction(formData.value)
      tokenStore.recordManualForm()
      const dest = returnTo.value || (formData.value.goalId ? `/goals/${formData.value.goalId}` : fromPocketId.value ? `/pockets/${fromPocketId.value}` : '/')
      const type = formData.value.type as 'income' | 'expense'
      const payload = formData.value.goalId
        ? { goalId: formData.value.goalId, amount: formData.value.amount, type }
        : { pocketId: formData.value.pocketId, amount: formData.value.amount, type }
      successThenRedirect(dest, payload)
    }
  } catch (error: unknown) {
    const err = error as Error & { currentBalance?: number; amount?: number }
    if (err.message === 'INSUFFICIENT_POCKET_BALANCE' && err.currentBalance != null && err.amount != null) {
      showAlertModal(
        t('pocket.insufficientBalanceTitle'),
        t('pocket.insufficientBalanceMessage', { balance: formatIDR(err.currentBalance), amount: formatIDR(err.amount) }),
        'warning',
      )
      return
    }
    console.error('Error saving transaction:', error)
    showAlertModal(t('transaction.saveFailed'), t('transaction.saveFailedDesc'), 'error')
  }
}

function handleSaveAndAddMore() {
  // Final date validation before adding to pending
  if (formData.value.date && isDateInFuture(formData.value.date)) {
    showAlertModal(
      t('transaction.dateInvalid'),
      t('transaction.dateInvalidDesc'),
      'warning'
    )
    // Auto-correct to today
    formData.value.date = getTodayDate()
    return
  }

  const error = validateForm(formData.value)
  if (error) {
    showAlertModal(t('transaction.validationFailed'), error, 'warning')
    return
  }

  if (editingIndex.value !== null) {
    // Update existing pending transaction
    const existingTransaction = pendingTransactions.value[editingIndex.value]
    if (existingTransaction) {
      pendingTransactions.value[editingIndex.value] = {
        ...formData.value,
        tempId: existingTransaction.tempId,
      }
    }
    editingIndex.value = null
  } else {
    // Add new pending transaction
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    pendingTransactions.value.push({
      ...formData.value,
      tempId,
    })
  }

  // Reset form tapi tetap pertahankan kantong & goal yang sudah dipilih
  const keepPocketId = formData.value.pocketId
  const keepGoalId = formData.value.goalId
  formData.value = {
    type: defaultFormData.type,
    amount: defaultFormData.amount,
    description: defaultFormData.description,
    category: defaultFormData.category,
    date: getTodayDate(),
    pocketId: keepPocketId,
    goalId: keepGoalId,
  }
}

function handleEdit(index: number) {
  closeActionMenu()
  const transaction = pendingTransactions.value[index]
  if (!transaction) return

  editingIndex.value = index
  formData.value = {
    type: transaction.type,
    amount: transaction.amount,
    description: transaction.description,
    category: transaction.category,
    date: transaction.date || getTodayDate(),
  }
  // Scroll to form
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function handleDelete(index: number) {
  closeActionMenu()
  transactionIndexToDelete.value = index
  showDeleteConfirm.value = true
}

function confirmDelete() {
  if (transactionIndexToDelete.value !== null) {
    const index = transactionIndexToDelete.value
    pendingTransactions.value.splice(index, 1)
    if (editingIndex.value === index) {
      editingIndex.value = null
      const keepPocketId = formData.value.pocketId
      const keepGoalId = formData.value.goalId
      formData.value = {
        type: defaultFormData.type,
        amount: defaultFormData.amount,
        description: defaultFormData.description,
        category: defaultFormData.category,
        date: getTodayDate(),
        pocketId: keepPocketId,
        goalId: keepGoalId,
      }
    } else if (editingIndex.value !== null && editingIndex.value > index) {
      editingIndex.value--
    }
    transactionIndexToDelete.value = null
  }
}

async function handleSubmitAll() {
  if (pendingTransactions.value.length === 0) {
    showAlertModal(t('transaction.noTransactions'), t('transaction.noTransactionsDesc'), 'warning')
    return
  }

  // Validate all pending transactions have valid dates
  const invalidDates = pendingTransactions.value.filter(t => isDateInFuture(t.date))
  if (invalidDates.length > 0) {
    showAlertModal(
      t('transaction.dateInvalid'),
      t('transaction.dateInvalidMultiple'),
      'warning'
    )
    return
  }

  const count = pendingTransactions.value.length
  if (tokenStore.getRemainingUsage('manualForm') < count) {
    showManualFormUpgradeModal.value = true
    return
  }

  try {
    for (const transaction of pendingTransactions.value) {
      if (isDateInFuture(transaction.date)) continue
      await createTransaction(transaction)
      tokenStore.recordManualForm()
    }
    pendingTransactions.value = []
    const dest = returnTo.value || '/'
    successThenRedirect(dest, { multi: true, count })
  } catch (error: unknown) {
    const err = error as Error & { currentBalance?: number; amount?: number }
    if (err.message === 'INSUFFICIENT_POCKET_BALANCE' && err.currentBalance != null && err.amount != null) {
      showAlertModal(
        t('pocket.insufficientBalanceTitle'),
        t('pocket.insufficientBalanceMessage', { balance: formatIDR(err.currentBalance), amount: formatIDR(err.amount) }),
        'warning',
      )
      return
    }
    console.error('Error saving transactions:', error)
    showAlertModal(t('transaction.saveAllFailed'), t('transaction.saveAllFailedDesc'), 'error')
  }
}

function handleCancel() {
  // CRITICAL: Set canceling flag to prevent any auto-save
  isCancelling.value = true

  // CRITICAL: When canceling, ensure no data is saved
  // Clear any prefilled data from text input
  if (isFromTextInput.value) {
    // Reset form data to defaults
    formData.value = {
      type: defaultFormData.type,
      amount: defaultFormData.amount,
      description: defaultFormData.description,
      category: defaultFormData.category,
      date: getTodayDate(),
    }
    isFromTextInput.value = false
  }

  if (pendingTransactions.value.length > 0) {
    showCancelConfirm.value = true
  } else {
    setTimeout(() => { isCancelling.value = false }, 100)
    // Use back() so history stays [..., Detail]; replace(returnTo) would duplicate Detail and require 2 back clicks
    router.back()
  }
}

function confirmCancel() {
  // CRITICAL: Set canceling flag to prevent any auto-save
  isCancelling.value = true

  // CRITICAL: Clear all pending transactions
  pendingTransactions.value = []
  editingIndex.value = null
  showCancelConfirm.value = false

  setTimeout(() => { isCancelling.value = false }, 100)
  // Use back() so history stays [..., Detail]; replace(returnTo) would duplicate Detail and require 2 back clicks
  router.back()
}

function formatCurrency(amount: number): string {
  return formatIDR(amount)
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
</script>

<template>
  <div class="mx-auto max-w-[430px] min-h-0 space-y-6 overflow-y-auto px-4 pb-32 pt-24">
    <PageHeader :title="isEdit ? t('transaction.editTransactionTitle') : t('transaction.addTransactionTitle')"
      :subtitle="isEdit
        ? t('transaction.updateTransaction')
        : editingIndex !== null
          ? t('transaction.editPendingTransaction')
          : t('transaction.recordNewTransaction')
        " :show-back="true">
      <template v-if="!isEdit && !tokenStore.isLicenseActive" #right>
        <button type="button"
          class="flex shrink-0 items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-4 py-0.5 text-xs font-medium text-amber-800 shadow-sm transition-colors hover:bg-amber-100 hover:border-amber-300 dark:border-amber-700 dark:bg-amber-900/25 dark:text-amber-200 dark:hover:bg-amber-900/40"
          :aria-label="t('transaction.manualFormUsageLabelTap')" :title="t('transaction.manualFormUsageLabelTap')"
          @click="showManualFormUpgradeModal = true">
          <font-awesome-icon :icon="['fas', 'circle-info']" class="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          <span class="tabular-nums">{{ t('transaction.manualFormUsageLabel', {
            remaining: manualFormRemaining, max:
              manualFormMax
          }) }}</span>
        </button>
      </template>
    </PageHeader>

    <!-- Info Banner for Text Input -->
    <div v-if="isFromTextInput"
      class="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4">
      <div class="flex items-start gap-3">
        <div class="flex-shrink-0 mt-0.5">
          <font-awesome-icon :icon="['fas', 'info-circle']" class="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">
            {{ t('transaction.dataFromTextInput') }}
          </p>
          <p class="text-xs text-blue-700 dark:text-blue-300">
            {{ t('transaction.dataFromTextInputDesc') }}
          </p>
        </div>
      </div>
    </div>

    <BaseCard class="overflow-visible">
      <TransactionForm v-model="formData" :categories="categories" :loading="loading" :pocket-options="pocketOptions"
        :locked-pocket-id="lockedPocketId" @submit="handleSubmit">
        <template #actions>
          <div class="flex flex-wrap gap-2">
            <BaseButton variant="secondary" @click="handleCancel" class="flex-1 min-w-[100px]">
              {{ t('common.cancel') }}
            </BaseButton>
            <BaseButton v-if="pendingTransactions.length === 0" type="submit" :loading="loading"
              class="flex-1 min-w-[100px]">
              {{ isEdit ? t('transaction.update') : t('transaction.save') }}
            </BaseButton>
            <div v-if="!isEdit" class="w-full px-0 pt-4">
              <BaseButton type="button" variant="teritary" :loading="loading" @click="handleSaveAndAddMore"
                class="w-full">
                {{ editingIndex !== null ? t('transaction.updateAndAddMore') : t('transaction.saveAndAddMore') }}
              </BaseButton>
              <p class="mt-2 text-center italic text-sm text-slate-600 dark:text-slate-400">
                {{ t('transaction.saveAndAddMoreDesc') }}
              </p>
            </div>
          </div>
        </template>
      </TransactionForm>
    </BaseCard>

    <!-- Pending Transactions Table (only show when not editing and has pending items) -->
    <div v-if="!isEdit && pendingTransactions.length > 0" class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-semibold text-slate-900 dark:text-slate-100">
          {{ t('transaction.pendingTransactions') }} ({{ pendingTransactions.length }})
        </h2>
      </div>

      <BaseCard>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-slate-200 dark:border-slate-700">
                <th class="px-2 py-1.5 text-left text-[10px] font-medium text-slate-600 dark:text-slate-400">{{
                  t('transaction.type') }}</th>
                <th class="px-2 py-1.5 text-left text-[10px] font-medium text-slate-600 dark:text-slate-400">{{
                  t('transaction.description') }}
                </th>
                <th class="px-2 py-1.5 text-left text-[10px] font-medium text-slate-600 dark:text-slate-400">{{
                  t('transaction.amount') }}</th>
                <th class="px-2 py-1.5 text-left text-[10px] font-medium text-slate-600 dark:text-slate-400">{{
                  t('transaction.date') }}
                </th>
                <th class="px-2 py-1.5 text-right text-[10px] font-medium text-slate-600 dark:text-slate-400">{{
                  t('transaction.actions') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 dark:divide-slate-700">
              <tr v-for="(transaction, index) in pendingTransactions" :key="transaction.tempId"
                class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td class="px-2 py-1.5 text-xs">
                  <span :class="[
                    'inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                    transaction.type === 'income'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
                  ]">
                    {{ transaction.type === 'income' ? t('transaction.incomeLabel') : t('transaction.expenseLabel') }}
                  </span>
                </td>
                <td class="px-2 py-1.5 text-xs text-slate-900 dark:text-slate-100">
                  <div class="max-w-[120px] truncate" :title="transaction.description">
                    {{ transaction.description }}
                  </div>
                  <div class="text-[10px] text-slate-500 dark:text-slate-400">{{ transaction.category }}</div>
                </td>
                <td class="px-2 py-1.5 text-xs font-medium text-slate-900 dark:text-slate-100">
                  {{ formatCurrency(transaction.amount) }}
                </td>
                <td class="px-2 py-1.5 text-xs text-slate-600 dark:text-slate-400">
                  {{ formatDate(transaction.date) }}
                </td>
                <td class="px-2 py-1.5 text-right relative">
                  <div class="flex items-center justify-end">
                    <button type="button"
                      class="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                      :aria-label="t('transaction.actions')" :aria-expanded="openActionIndex === index"
                      @click.stop="openActionIndex = openActionIndex === index ? null : index">
                      <font-awesome-icon :icon="['fas', 'ellipsis-vertical']" class="h-4 w-4" />
                    </button>
                    <Transition enter-active-class="transition ease-out duration-100"
                      enter-from-class="opacity-0 scale-95" enter-to-class="opacity-100 scale-100"
                      leave-active-class="transition ease-in duration-75" leave-from-class="opacity-100 scale-100"
                      leave-to-class="opacity-0 scale-95">
                      <div v-if="openActionIndex === index"
                        class="absolute right-0 top-full z-20 mt-1 min-w-[120px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-600 dark:bg-slate-800">
                        <button type="button"
                          class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                          @click.stop="handleEdit(index)">
                          <font-awesome-icon :icon="['fas', 'edit']"
                            class="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                          {{ t('common.edit') }}
                        </button>
                        <button type="button"
                          class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                          @click.stop="handleDelete(index)">
                          <font-awesome-icon :icon="['fas', 'trash']" class="h-3.5 w-3.5" />
                          {{ t('common.delete') }}
                        </button>
                      </div>
                    </Transition>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </BaseCard>

      <!-- Submit All Button -->
      <BaseCard>
        <div class="flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-slate-900 dark:text-slate-100">
                {{ t('transaction.total') }}: {{formatCurrency(pendingTransactions.reduce((sum, t) => sum + (t.type ===
                  'income' ? t.amount :
                  -t.amount), 0))}}
              </p>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                {{pendingTransactions.filter(t => t.type === 'income').length}} {{ t('transaction.income') }},
                {{pendingTransactions.filter(t => t.type === 'expense').length}} {{ t('transaction.expense') }}
              </p>
            </div>
          </div>
          <BaseButton @click="handleSubmitAll" :loading="loading" class="w-full" size="lg">
            {{ t('transaction.saveAllTransactions') }} ({{ pendingTransactions.length }})
          </BaseButton>
        </div>
      </BaseCard>
    </div>
  </div>

  <!-- Delete Confirmation Modal -->
  <ConfirmModal :is-open="showDeleteConfirm" :title="t('transaction.deleteTransaction')"
    :message="t('transaction.deleteTransactionConfirm')" :confirm-text="t('common.delete')"
    :cancel-text="t('common.cancel')" variant="danger" :icon="['fas', 'trash']" @confirm="confirmDelete"
    @close="showDeleteConfirm = false" />

  <!-- Cancel Confirmation Modal -->
  <ConfirmModal :is-open="showCancelConfirm" :title="t('transaction.cancelTransaction')"
    :message="t('transaction.cancelTransactionConfirm')" :confirm-text="t('common.cancel')"
    :cancel-text="t('transaction.continueEdit')" variant="warning" :icon="['fas', 'exclamation-triangle']"
    @confirm="confirmCancel" @close="showCancelConfirm = false" />

  <!-- Manual form limit: upgrade to premium -->
  <BottomSheet :is-open="showManualFormUpgradeModal" :title="t('transaction.manualFormBasicLimit')" maxHeight="60"
    @close="showManualFormUpgradeModal = false">
    <div class="space-y-4">
      <div class="flex flex-col items-center justify-center py-0 text-center">
        <div class="mb-4 rounded-full bg-slate-100 p-3 dark:bg-slate-800">
          <font-awesome-icon :icon="['fas', 'crown']" class="h-6 w-6 text-slate-400" />
        </div>
        <h3 class="mb-2 text-lg font-bold text-slate-900 dark:text-slate-100">
          {{ t('transaction.manualFormBasicLimit') }}
        </h3>
        <p class="text-sm text-slate-600 dark:text-slate-400 max-w-xs mx-auto">
          {{ t('transaction.manualFormBasicLimitDesc', {
            remaining: manualFormRemaining,
            max: manualFormMax,
          }) }}
        </p>
      </div>
      <div class="pt-2">
        <BaseButton class="w-full justify-center" size="lg"
          @click="showManualFormUpgradeModal = false; paymentModalStore.openPaymentModal()">
          <font-awesome-icon :icon="['fas', 'crown']" class="mr-2" />
          {{ t('transaction.manualFormActivateLicense') }}
        </BaseButton>
      </div>
    </div>
  </BottomSheet>

  <!-- Alert Modal -->
  <AlertModal :is-open="showAlert" :title="alertTitle" :message="alertMessage" :variant="alertVariant"
    @close="showAlert = false" />
</template>
