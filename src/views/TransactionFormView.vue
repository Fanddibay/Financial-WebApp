<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTransactions } from '@/composables/useTransactions'
import { useAddTransactionFlow } from '@/composables/useAddTransactionFlow'
import { useToastStore } from '@/stores/toast'
import { usePocketStore } from '@/stores/pocket'
import { MAIN_POCKET_ID } from '@/services/pocketService'
import type { TransactionFormData } from '@/types/transaction'
import TransactionForm from '@/components/transactions/TransactionForm.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import AlertModal from '@/components/ui/AlertModal.vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { formatIDR } from '@/utils/currency'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const route = useRoute()
const router = useRouter()
const toastStore = useToastStore()
const pocketStore = usePocketStore()
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
    applyDefaultCategory()
    if (query.from === 'text-input') {
      isFromTextInput.value = true
      if (query.type) formData.value.type = query.type as 'income' | 'expense'
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
    // Determine variant based on error message
    let variant: 'error' | 'warning' = 'error'
    if (error.includes('masa depan') || error.includes('future')) {
      variant = 'warning'
    }
    showAlertModal(t('transaction.validationFailed'), error, variant)
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
      const dest = returnTo.value || (fromPocketId.value ? `/pockets/${fromPocketId.value}` : '/')
      const type = formData.value.type as 'income' | 'expense'
      successThenRedirect(dest, {
        pocketId: formData.value.pocketId,
        amount: formData.value.amount,
        type,
      })
    }
  } catch (error) {
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
    // Determine variant based on error message
    let variant: 'error' | 'warning' = 'error'
    if (error.includes('masa depan') || error.includes('future')) {
      variant = 'warning'
    }
    showAlertModal(t('transaction.validationFailed'), error, variant)
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

  // Reset form
  formData.value = {
    type: defaultFormData.type,
    amount: defaultFormData.amount,
    description: defaultFormData.description,
    category: defaultFormData.category,
    date: getTodayDate(),
  }
}

function handleEdit(index: number) {
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
  transactionIndexToDelete.value = index
  showDeleteConfirm.value = true
}

function confirmDelete() {
  if (transactionIndexToDelete.value !== null) {
    const index = transactionIndexToDelete.value
    pendingTransactions.value.splice(index, 1)
    if (editingIndex.value === index) {
      editingIndex.value = null
      formData.value = {
        type: defaultFormData.type,
        amount: defaultFormData.amount,
        description: defaultFormData.description,
        category: defaultFormData.category,
        date: getTodayDate(),
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

  try {
    const count = pendingTransactions.value.length
    for (const transaction of pendingTransactions.value) {
      if (isDateInFuture(transaction.date)) continue
      await createTransaction(transaction)
    }
    pendingTransactions.value = []
    const dest = returnTo.value || '/'
    successThenRedirect(dest, { multi: true, count })
  } catch (error) {
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
    router.replace({ query: {} }).then(() => {
      setTimeout(() => { isCancelling.value = false }, 100)
      if (returnTo.value) router.push(returnTo.value)
      else router.back()
    }).catch(() => {
      isCancelling.value = false
      if (returnTo.value) router.push(returnTo.value)
      else router.back()
    })
  }
}

function confirmCancel() {
  // CRITICAL: Set canceling flag to prevent any auto-save
  isCancelling.value = true

  // CRITICAL: Clear all pending transactions and query params
  pendingTransactions.value = []
  editingIndex.value = null

  router.replace({ query: {} }).then(() => {
    setTimeout(() => { isCancelling.value = false }, 100)
    if (returnTo.value) router.push(returnTo.value)
    else router.back()
  }).catch(() => {
    isCancelling.value = false
    if (returnTo.value) router.push(returnTo.value)
    else router.back()
  })
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
  <div class="mx-auto max-w-[430px] space-y-6 px-4 pb-24 pt-0 min-h-0 overflow-y-auto">
    <PageHeader :title="isEdit ? t('transaction.editTransactionTitle') : t('transaction.addTransactionTitle')"
      :subtitle="isEdit
          ? t('transaction.updateTransaction')
          : editingIndex !== null
            ? t('transaction.editPendingTransaction')
            : t('transaction.recordNewTransaction')
        " :show-back="true" />

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
            <div v-if="!isEdit" class="w-full p-4">
              <BaseButton type="button" variant="secondary" :loading="loading" @click="handleSaveAndAddMore"
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
        <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">
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
                <td class="px-2 py-1.5 text-right">
                  <div class="flex items-center justify-end gap-1">
                    <button type="button" @click="handleEdit(index)"
                      class="rounded-lg p-1 text-slate-600 transition hover:bg-slate-100 hover:text-brand dark:text-slate-400 dark:hover:bg-slate-700"
                      :title="t('common.edit')">
                      <font-awesome-icon :icon="['fas', 'edit']" class="h-3 w-3" />
                    </button>
                    <button type="button" @click="handleDelete(index)"
                      class="rounded-lg p-1 text-red-600 transition hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/30"
                      :title="t('common.delete')">
                      <font-awesome-icon :icon="['fas', 'trash']" class="h-3 w-3" />
                    </button>
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

  <!-- Alert Modal -->
  <AlertModal :is-open="showAlert" :title="alertTitle" :message="alertMessage" :variant="alertVariant"
    @close="showAlert = false" />
</template>
