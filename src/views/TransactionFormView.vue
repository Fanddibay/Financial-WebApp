<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTransactions } from '@/composables/useTransactions'
import type { TransactionFormData } from '@/types/transaction'
import TransactionForm from '@/components/transactions/TransactionForm.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import AlertModal from '@/components/ui/AlertModal.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { formatIDR } from '@/utils/currency'

const route = useRoute()
const router = useRouter()
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
})

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
}

onMounted(async () => {
  if (isEdit.value) {
    const id = transactionId.value
    if (!id) {
      router.push('/transactions')
      return
    }
    await fetchTransactions()
    const transaction = getTransactionById(id)
    if (transaction) {
      formData.value = {
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description,
        category: transaction.category,
        date: transaction.date,
      }
    } else {
      router.push('/transactions')
    }
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
    return 'Deskripsi wajib diisi'
  }
  if (data.amount <= 0) {
    return 'Jumlah harus lebih dari 0'
  }
  if (!data.category) {
    return 'Kategori wajib dipilih'
  }
  if (!data.date) {
    return 'Tanggal wajib diisi'
  }
  if (isDateInFuture(data.date)) {
    return 'Tanggal tidak boleh di masa depan. Silakan pilih tanggal hari ini atau sebelumnya.'
  }
  return null
}

async function handleSubmit() {
  // Final date validation before submission
  if (formData.value.date && isDateInFuture(formData.value.date)) {
    showAlertModal(
      'Tanggal Tidak Valid',
      'Tanggal tidak boleh di masa depan. Silakan pilih tanggal hari ini atau sebelumnya.',
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
    if (error.includes('masa depan')) {
      variant = 'warning'
    }
    showAlertModal('Validasi Gagal', error, variant)
    return
  }

  try {
    if (isEdit.value) {
      const id = transactionId.value
      if (!id) {
        return
      }
      await updateTransaction(id, formData.value)
      router.push('/')
    } else {
      const transaction = await createTransaction(formData.value)
      // Store transaction data in sessionStorage for notification
      sessionStorage.setItem('newTransaction', JSON.stringify({
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description,
        category: transaction.category,
        date: transaction.date,
      }))
      router.push('/')
    }
  } catch (error) {
    console.error('Error saving transaction:', error)
    showAlertModal('Gagal Menyimpan', 'Gagal menyimpan transaksi. Coba lagi ya.', 'error')
  }
}

function handleSaveAndAddMore() {
  // Final date validation before adding to pending
  if (formData.value.date && isDateInFuture(formData.value.date)) {
    showAlertModal(
      'Tanggal Tidak Valid',
      'Tanggal tidak boleh di masa depan. Silakan pilih tanggal hari ini atau sebelumnya.',
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
    if (error.includes('masa depan')) {
      variant = 'warning'
    }
    showAlertModal('Validasi Gagal', error, variant)
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
    showAlertModal('Tidak Ada Transaksi', 'Tidak ada transaksi untuk disimpan', 'warning')
    return
  }

  // Validate all pending transactions have valid dates
  const invalidDates = pendingTransactions.value.filter(t => isDateInFuture(t.date))
  if (invalidDates.length > 0) {
    showAlertModal(
      'Tanggal Tidak Valid',
      `Beberapa transaksi memiliki tanggal masa depan. Silakan perbaiki tanggal sebelum menyimpan.`,
      'warning'
    )
    return
  }

  try {
    // Save all pending transactions
    const lastTransaction = pendingTransactions.value[pendingTransactions.value.length - 1]
    for (const transaction of pendingTransactions.value) {
      // Final validation before saving
      if (isDateInFuture(transaction.date)) {
        console.warn(`Skipping transaction with future date: ${transaction.date}`)
        continue
      }
      await createTransaction(transaction)
    }

    // Store last transaction data for notification
    if (lastTransaction) {
      sessionStorage.setItem('newTransaction', JSON.stringify({
        type: lastTransaction.type,
        amount: lastTransaction.amount,
        description: lastTransaction.description,
        category: lastTransaction.category,
        date: lastTransaction.date,
      }))
    }

    // Clear pending transactions and navigate
    pendingTransactions.value = []
    router.push('/')
  } catch (error) {
    console.error('Error saving transactions:', error)
    showAlertModal('Gagal Menyimpan', 'Gagal menyimpan beberapa transaksi. Coba lagi ya.', 'error')
  }
}

function handleCancel() {
  if (pendingTransactions.value.length > 0) {
    showCancelConfirm.value = true
  } else {
    router.back()
  }
}

function confirmCancel() {
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
  <div class="mx-auto max-w-[430px] space-y-6 px-4 pb-24 pt-8 min-h-0 overflow-y-auto">
    <div>
      <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">
        {{ isEdit ? 'Edit Transaksi' : 'Tambah Transaksi' }}
      </h1>
      <p class="mt-1 text-slate-600 dark:text-slate-400">
        {{
          isEdit
            ? 'Update detail transaksi'
            : editingIndex !== null
              ? 'Edit transaksi yang belum disimpan'
              : 'Catat income atau expense baru'
        }}
      </p>
    </div>

    <BaseCard class="overflow-visible">
      <TransactionForm v-model="formData" :categories="categories" :loading="loading" @submit="handleSubmit">
        <template #actions>
          <div class="flex flex-wrap gap-2">
            <BaseButton variant="secondary" @click="handleCancel" class="flex-1 min-w-[100px]">
              Batal
            </BaseButton>
            <BaseButton
              v-if="pendingTransactions.length === 0"
              type="submit"
              :loading="loading"
              class="flex-1 min-w-[100px]"
            >
              {{ isEdit ? 'Update' : 'Simpan' }}
            </BaseButton>
            <div v-if="!isEdit" class="w-full p-4">
              <BaseButton
                type="button"
                variant="secondary"
                :loading="loading"
                @click="handleSaveAndAddMore"
                class="w-full"
              >
                {{ editingIndex !== null ? 'Update & Tambah Lagi' : 'Simpan & Tambah Lagi' }}
              </BaseButton>
              <p class="mt-2 text-center italic text-sm text-slate-600 dark:text-slate-400">
                Pilih opsi ini kalau mau tambah lebih dari 1 transaksi sekaligus
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
          Transaksi Belum Disimpan ({{ pendingTransactions.length }})
        </h2>
      </div>

      <BaseCard>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-slate-200 dark:border-slate-700">
                <th class="px-2 py-1.5 text-left text-[10px] font-medium text-slate-600 dark:text-slate-400">Tipe</th>
                <th class="px-2 py-1.5 text-left text-[10px] font-medium text-slate-600 dark:text-slate-400">Deskripsi</th>
                <th class="px-2 py-1.5 text-left text-[10px] font-medium text-slate-600 dark:text-slate-400">Jumlah</th>
                <th class="px-2 py-1.5 text-left text-[10px] font-medium text-slate-600 dark:text-slate-400">Tanggal</th>
                <th class="px-2 py-1.5 text-right text-[10px] font-medium text-slate-600 dark:text-slate-400">Aksi</th>
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
                    {{ transaction.type === 'income' ? 'Income' : 'Expense' }}
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
                      title="Edit">
                      <font-awesome-icon :icon="['fas', 'edit']" class="h-3 w-3" />
                    </button>
                    <button type="button" @click="handleDelete(index)"
                      class="rounded-lg p-1 text-red-600 transition hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/30"
                      title="Delete">
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
                Total: {{formatCurrency(pendingTransactions.reduce((sum, t) => sum + (t.type === 'income' ? t.amount :
                  -t.amount), 0))}}
              </p>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                {{pendingTransactions.filter(t => t.type === 'income').length}} income,
                {{pendingTransactions.filter(t => t.type === 'expense').length}} expense
              </p>
            </div>
          </div>
          <BaseButton @click="handleSubmitAll" :loading="loading" class="w-full" size="lg">
            Simpan Semua Transaksi ({{ pendingTransactions.length }})
          </BaseButton>
        </div>
      </BaseCard>
    </div>
  </div>

  <!-- Delete Confirmation Modal -->
  <ConfirmModal
    :is-open="showDeleteConfirm"
    title="Hapus Transaksi"
    message="Yakin mau hapus transaksi ini dari daftar? Tindakan ini tidak bisa dibatalkan."
    confirm-text="Hapus"
    cancel-text="Batal"
    variant="danger"
    :icon="['fas', 'trash']"
    @confirm="confirmDelete"
    @close="showDeleteConfirm = false"
  />

  <!-- Cancel Confirmation Modal -->
  <ConfirmModal
    :is-open="showCancelConfirm"
    title="Transaksi Belum Disimpan"
    message="Kamu punya transaksi yang belum disimpan. Yakin mau batal? Semua perubahan akan hilang."
    confirm-text="Batal"
    cancel-text="Lanjut Edit"
    variant="warning"
    :icon="['fas', 'exclamation-triangle']"
    @confirm="confirmCancel"
    @close="showCancelConfirm = false"
  />

  <!-- Alert Modal -->
  <AlertModal
    :is-open="showAlert"
    :title="alertTitle"
    :message="alertMessage"
    :variant="alertVariant"
    @close="showAlert = false"
  />
</template>
