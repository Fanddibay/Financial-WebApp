<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useTransactions } from '@/composables/useTransactions'
import TransactionCard from '@/components/transactions/TransactionCard.vue'
import ReceiptScanner from '@/components/transactions/ReceiptScanner.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseDatePicker from '@/components/ui/BaseDatePicker.vue'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { exportToXLSX, exportToPDF } from '@/utils/export'
import type { TransactionFormData, TransactionType } from '@/types/transaction'

const router = useRouter()
const {
  transactions,
  summary,
  categories,
  // Removed unused variables: incomeTransactionsByCategory, transactionsByCategory
  fetchTransactions,
  deleteTransaction,
  createTransaction,
} = useTransactions()

const searchQuery = ref('')
const filterType = ref<TransactionType | 'all'>('all')
const filterCategory = ref('')
const showScanner = ref(false)
const showFilterSection = ref(false)
const showDeleteConfirm = ref(false)
const transactionToDelete = ref<string | null>(null)
const showScrollToTop = ref(false)

// Date filter state
type DateFilterType = 'none' | 'today' | 'last7days' | 'last30days' | 'custom'
const dateFilterType = ref<DateFilterType>('none')
const customStartDate = ref('')
const customEndDate = ref('')

const typeOptions = [
  { value: 'all', label: 'Semua' },
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
]

const categoryOptions = computed(() => {
  const baseOptions = [{ value: '', label: 'Semua Kategori' }]

  if (filterType.value === 'all') {
    // Get unique categories from all transactions
    const allCategories = new Set<string>()
    transactions.value.forEach((t) => allCategories.add(t.category))
    return [
      ...baseOptions,
      ...Array.from(allCategories).map((cat) => ({ value: cat, label: cat })),
    ]
  } else if (filterType.value === 'income') {
    // Get categories from income transactions
    const incomeCategories = new Set<string>()
    transactions.value
      .filter((t) => t.type === 'income')
      .forEach((t) => incomeCategories.add(t.category))
    return [
      ...baseOptions,
      ...Array.from(incomeCategories).map((cat) => ({ value: cat, label: cat })),
    ]
  } else {
    // Get categories from expense transactions
    const expenseCategories = new Set<string>()
    transactions.value
      .filter((t) => t.type === 'expense')
      .forEach((t) => expenseCategories.add(t.category))
    return [
      ...baseOptions,
      ...Array.from(expenseCategories).map((cat) => ({ value: cat, label: cat })),
    ]
  }
})

// Date range helpers
function getDateRange(type: DateFilterType): { start: Date; end: Date } | null {
  const today = new Date()
  today.setHours(23, 59, 59, 999) // End of today

  switch (type) {
    case 'today': {
      const start = new Date(today)
      start.setHours(0, 0, 0, 0)
      return { start, end: today }
    }
    case 'last7days': {
      const start = new Date(today)
      start.setDate(start.getDate() - 6)
      start.setHours(0, 0, 0, 0)
      return { start, end: today }
    }
    case 'last30days': {
      const start = new Date(today)
      start.setDate(start.getDate() - 29)
      start.setHours(0, 0, 0, 0)
      return { start, end: today }
    }
    case 'custom': {
      if (customStartDate.value && customEndDate.value) {
        const start = new Date(customStartDate.value)
        start.setHours(0, 0, 0, 0)
        const end = new Date(customEndDate.value)
        end.setHours(23, 59, 59, 999)
        return { start, end }
      }
      return null
    }
    default:
      return null
  }
}

const filteredTransactions = computed(() => {
  let result = [...transactions.value]

  // Filter by type
  if (filterType.value !== 'all') {
    result = result.filter((t) => t.type === filterType.value)
  }

  // Filter by category
  if (filterCategory.value) {
    result = result.filter((t) => t.category === filterCategory.value)
  }

  // Filter by date range
  if (dateFilterType.value !== 'none') {
    const dateRange = getDateRange(dateFilterType.value)
    if (dateRange) {
      result = result.filter((t) => {
        const transactionDate = new Date(t.date)
        return transactionDate >= dateRange.start && transactionDate <= dateRange.end
      })
    }
  }

  // Filter by search query
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(
      (t) =>
        t.description.toLowerCase().includes(query) ||
        t.category.toLowerCase().includes(query),
    )
  }

  // Sort by createdAt (waktu input) - yang paling baru di input di atas
  return result.sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
    return timeB - timeA // Descending: newest first
  })
})

const activeFiltersCount = computed(() => {
  let count = 0
  if (filterType.value !== 'all') count++
  if (filterCategory.value) count++
  if (dateFilterType.value !== 'none') count++
  return count
})

const dateFilterLabel = computed(() => {
  switch (dateFilterType.value) {
    case 'today':
      return 'Today'
    case 'last7days':
      return 'Last 7 Days'
    case 'last30days':
      return 'Last 30 Days'
    case 'custom':
      if (customStartDate.value && customEndDate.value) {
        const start = new Date(customStartDate.value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        const end = new Date(customEndDate.value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        return `${start} - ${end}`
      }
      return 'Custom Range'
    default:
      return 'Date Range'
  }
})

function resetFilters() {
  filterType.value = 'all'
  filterCategory.value = ''
  dateFilterType.value = 'none'
  customStartDate.value = ''
  customEndDate.value = ''
}

function setDateFilter(type: DateFilterType) {
  dateFilterType.value = type
  if (type !== 'custom') {
    customStartDate.value = ''
    customEndDate.value = ''
  }
}

function clearDateFilter() {
  dateFilterType.value = 'none'
  customStartDate.value = ''
  customEndDate.value = ''
}

// Reset category filter when type changes if the selected category is not available
watch(filterType, () => {
  if (filterCategory.value) {
    const availableCategories = categoryOptions.value.map((opt) => opt.value)
    if (!availableCategories.includes(filterCategory.value)) {
      filterCategory.value = ''
    }
  }
})


function handleEdit(id: string) {
  router.push({ name: 'transaction-edit', params: { id } })
}

function handleDelete(id: string) {
  transactionToDelete.value = id
  showDeleteConfirm.value = true
}

function confirmDelete() {
  if (transactionToDelete.value) {
    deleteTransaction(transactionToDelete.value)
    transactionToDelete.value = null
  }
}

function handleExportXLSX() {
  const filename = `transactions-${new Date().toISOString().split('T')[0]}.xlsx`
  exportToXLSX(filteredTransactions.value, filename)
}

function handleExportPDF() {
  const filename = `transactions-${new Date().toISOString().split('T')[0]}.pdf`
  exportToPDF(filteredTransactions.value, summary.value, filename)
}

function handleScanComplete(data: TransactionFormData) {
  createTransaction(data)
  fetchTransactions()
}

function handleScanCompleteMultiple(data: TransactionFormData[]) {
  data.forEach((transaction) => {
    createTransaction(transaction)
  })
  fetchTransactions()
}

function handleScroll() {
  const scrollThreshold = window.innerHeight * 1.5
  showScrollToTop.value = window.scrollY > scrollThreshold
}

function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: 'smooth',
  })
}

onMounted(() => {
  fetchTransactions()
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <div class="mx-auto max-w-[430px] space-y-6 px-4 pb-24 pt-8">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Riwayat Transaksi</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400">Cari dan filter riwayat transaksi kamu</p>
      </div>
      <!-- <div class="flex items-center gap-2">
        <BaseButton size="sm" variant="secondary" @click="showScanner = true">
          <font-awesome-icon :icon="['fas', 'camera']" />
        </BaseButton>
        <router-link to="/transactions/new">
          <BaseButton size="sm">
            <font-awesome-icon :icon="['fas', 'plus']" />
          </BaseButton>
        </router-link>
      </div> -->
    </div>

    <BaseCard>
      <div class="space-y-4">
        <div class="relative">
          <font-awesome-icon :icon="['fas', 'search']"
            class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input v-model="searchQuery" type="text" placeholder="Cari transaksi..."
            class="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 py-2 pl-10 pr-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 placeholder:text-slate-400 dark:placeholder:text-slate-500" />
        </div>
        <div class="space-y-3">
          <BaseButton variant="secondary" class="w-full" @click="showFilterSection = !showFilterSection">
            <font-awesome-icon :icon="['fas', 'filter']" class="mr-2" />
            Filter
            <span v-if="activeFiltersCount > 0"
              class="ml-2 rounded-full bg-brand px-2 py-0.5 text-xs font-semibold text-white">
              {{ activeFiltersCount }}
            </span>
            <font-awesome-icon :icon="['fas', showFilterSection ? 'chevron-up' : 'chevron-down']" class="ml-auto" />
          </BaseButton>

          <!-- Expandable Filter Section -->
          <Transition enter-active-class="transition-all duration-200 ease-out" enter-from-class="opacity-0 max-h-0"
            enter-to-class="opacity-100 max-h-[800px]" leave-active-class="transition-all duration-200 ease-in"
            leave-from-class="opacity-100 max-h-[800px]" leave-to-class="opacity-0 max-h-0">
            <div v-if="showFilterSection"
              class="overflow-hidden space-y-4 pt-2 border-t border-slate-200 dark:border-slate-700">
              <!-- Type Filter -->
              <div class="space-y-2">
                <label class="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Tipe Transaksi
                </label>
                <BaseSelect v-model="filterType" :options="typeOptions" />
              </div>

              <!-- Category Filter -->
              <div class="space-y-2">
                <label class="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Kategori
                </label>
                <BaseSelect v-model="filterCategory" :options="categoryOptions" />
              </div>

              <!-- Clear All Filters -->
              <div v-if="activeFiltersCount > 0" class="pt-2 border-t border-slate-200 dark:border-slate-700">
                <BaseButton variant="ghost" size="sm" class="w-full" @click="resetFilters">
                  <font-awesome-icon :icon="['fas', 'redo']" class="mr-2" />
                  Clear All Filters
                </BaseButton>
              </div>
            </div>
          </Transition>
        </div>

        <!-- Date Filter Section (Always Visible) -->
        <div class="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-700">
          <label class="text-sm font-medium text-slate-700 dark:text-slate-300">
            Periode Waktu
          </label>

          <!-- Quick Date Filters -->
          <div class="grid grid-cols-3 gap-2">
            <button type="button" @click="setDateFilter('today')" :class="[
              'rounded-lg px-3 py-2 text-xs font-medium transition',
              dateFilterType === 'today'
                ? 'bg-brand text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
            ]">
              Hari ini
            </button>
            <button type="button" @click="setDateFilter('last7days')" :class="[
              'rounded-lg px-3 py-2 text-xs font-medium transition',
              dateFilterType === 'last7days'
                ? 'bg-brand text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
            ]">
              7 Hari
            </button>
            <button type="button" @click="setDateFilter('last30days')" :class="[
              'rounded-lg px-3 py-2 text-xs font-medium transition',
              dateFilterType === 'last30days'
                ? 'bg-brand text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
            ]">
              30 Hari
            </button>
          </div>

          <!-- Custom Range -->
          <div class="space-y-2">
            <button type="button" @click="setDateFilter('custom')" :class="[
              'w-full rounded-lg px-3 py-2 text-xs font-medium transition text-left',
              dateFilterType === 'custom'
                ? 'bg-brand text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
            ]">
              <font-awesome-icon :icon="['fas', 'calendar-days']" class="mr-2" />
              Rentang Waktu
            </button>

            <Transition enter-active-class="transition-all duration-200 ease-out" enter-from-class="opacity-0 max-h-0"
              enter-to-class="opacity-100 max-h-[200px]" leave-active-class="transition-all duration-200 ease-in"
              leave-from-class="opacity-100 max-h-[200px]" leave-to-class="opacity-0 max-h-0">
              <div v-if="dateFilterType === 'custom'" class="overflow-hidden space-y-3 pt-2">
                <BaseDatePicker v-model="customStartDate" label="Start Date" :max-date="customEndDate || undefined" />
                <BaseDatePicker v-model="customEndDate" label="End Date" :min-date="customStartDate || undefined" />
              </div>
            </Transition>
          </div>

          <!-- Active Date Filter Display -->
          <div v-if="dateFilterType !== 'none'"
            class="flex items-center justify-between rounded-lg bg-brand/10 dark:bg-brand/20 px-3 py-2">
            <div class="flex items-center gap-2">
              <font-awesome-icon :icon="['fas', 'calendar-check']" class="text-brand" />
              <span class="text-sm font-medium text-slate-700 dark:text-slate-300">
                {{ dateFilterLabel }}
              </span>
            </div>
            <button type="button" @click="clearDateFilter"
              class="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
              <font-awesome-icon :icon="['fas', 'times']" />
            </button>
          </div>
        </div>
      </div>
    </BaseCard>

    <div class="flex gap-2">
      <BaseButton variant="secondary" size="sm" class="flex-1" @click="handleExportXLSX">
        <font-awesome-icon :icon="['fas', 'file-excel']" class="mr-2" />
        Excel
      </BaseButton>
      <BaseButton variant="secondary" size="sm" class="flex-1" @click="handleExportPDF">
        <font-awesome-icon :icon="['fas', 'file-pdf']" class="mr-2" />
        PDF
      </BaseButton>
    </div>

    <div v-if="filteredTransactions.length === 0" class="py-12 text-center text-slate-500 dark:text-slate-400">
      <p>
        {{
          searchQuery || filterCategory || filterType !== 'all' || dateFilterType !== 'none'
            ? 'Tidak ada transaksi yang sesuai dengan filter kamu.'
            : 'Belum ada transaksi nih. Yuk tambahkan transaksi pertama kamu!'
        }}
      </p>
    </div>

    <div v-else class="space-y-3">
      <TransactionCard v-for="transaction in filteredTransactions" :key="transaction.id" :transaction="transaction"
        @edit="handleEdit" @delete="handleDelete" />
    </div>

    <ReceiptScanner :is-open="showScanner" :categories="categories" @close="showScanner = false"
      @scan-complete="handleScanComplete" @scan-complete-multiple="handleScanCompleteMultiple" />

    <!-- Delete Confirmation Modal -->
    <ConfirmModal :is-open="showDeleteConfirm" title="Hapus Transaksi"
      message="Yakin mau hapus transaksi ini? Tindakan ini tidak bisa dibatalkan." confirm-text="Hapus"
      cancel-text="Batal" variant="danger" :icon="['fas', 'trash']" @confirm="confirmDelete"
      @close="showDeleteConfirm = false" />

    <!-- Scroll to Top Button -->
    <Transition enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 scale-90 translate-y-4" enter-to-class="opacity-100 scale-100 translate-y-0"
      leave-active-class="transition-all duration-200 ease-in" leave-from-class="opacity-100 scale-100 translate-y-0"
      leave-to-class="opacity-0 scale-90 translate-y-4">
      <button v-if="showScrollToTop" type="button" @click="scrollToTop"
        class="fixed bottom-44 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-brand text-white shadow-lg transition hover:bg-brand/90 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 dark:focus:ring-offset-slate-800"
        title="Scroll to top">
        <font-awesome-icon :icon="['fas', 'arrow-up']" class="h-5 w-5" />
      </button>
    </Transition>
  </div>
</template>
