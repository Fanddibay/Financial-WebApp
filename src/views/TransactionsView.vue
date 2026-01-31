<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, provide, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePocketLimits } from '@/composables/usePocketLimits'
import { useTransactions } from '@/composables/useTransactions'
import { useToastStore } from '@/stores/toast'
import { usePocketStore } from '@/stores/pocket'
import { useTokenStore } from '@/stores/token'
import TransactionCard from '@/components/transactions/TransactionCard.vue'
import ReceiptScanner from '@/components/transactions/ReceiptScanner.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseDatePicker from '@/components/ui/BaseDatePicker.vue'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import AlertModal from '@/components/ui/AlertModal.vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { exportToXLSX, exportToPDF } from '@/utils/export'
import type { TransactionFormData, TransactionType } from '@/types/transaction'
import { getCategoryWithIcon } from '@/utils/categoryIcons'
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const toastStore = useToastStore()
const {
  transactions,
  summary,
  categories,
  fetchTransactions,
  deleteTransaction,
  createTransaction,
} = useTransactions()
const pocketStore = usePocketStore()
const tokenStore = useTokenStore()
const { getActivePockets } = usePocketLimits()

const searchQuery = ref('')
const filterType = ref<TransactionType | 'all'>('all')
const filterCategory = ref('')
const filterPocketId = ref('')
const showScanner = ref(false)
const showDeleteConfirm = ref(false)
const transactionToDelete = ref<string | null>(null)
const showScrollToTop = ref(false)
const showExportNoDataModal = ref(false)
const showExportDropdown = ref(false)
const exportDropdownRef = ref<HTMLElement | null>(null)

const transactionMenuOpenId = ref<string | null>(null)
provide('transactionMenuOpenId', transactionMenuOpenId)
provide('transactionMenuSetOpenId', (id: string | null) => {
  transactionMenuOpenId.value = id
})

// Date filter state
type DateFilterType = 'none' | 'today' | 'last7days' | 'last30days' | 'custom'
const dateFilterType = ref<DateFilterType>('none')
const customStartDate = ref('')
const customEndDate = ref('')

const typeOptions = computed(() => [
  { value: 'all', label: t('common.all') },
  { value: 'income', label: t('transaction.incomeLabel') },
  { value: 'expense', label: t('transaction.expenseLabel') },
])

const categoryOptions = computed(() => {
  const baseOptions = [{ value: '', label: t('common.allCategories') }]

  if (filterType.value === 'all') {
    const categoryMap = new Map<string, 'income' | 'expense'>()
    transactions.value
      .filter((tx) => tx.type !== 'transfer' && tx.category)
      .forEach((tx) => {
        const type = tx.type as 'income' | 'expense'
        if (!categoryMap.has(tx.category)) categoryMap.set(tx.category, type)
      })

    // Normalize categories - replace "Other" with "Lainnya" if exists
    const normalizedCategories = Array.from(categoryMap.entries())
      .filter(([cat]) => {
        const lowerCat = cat.toLowerCase().trim()
        // Skip if it's "Other" - will use "Lainnya" instead if it exists
        return lowerCat !== 'other'
      })
      .map(([cat, type]) => {
        // Normalize "Other" to "Lainnya" if needed (shouldn't happen after filter, but just in case)
        const normalizedCat = cat.toLowerCase().trim() === 'other' ? 'Lainnya' : cat
        return [normalizedCat, type] as [string, 'income' | 'expense']
      })

    return [
      ...baseOptions,
      ...normalizedCategories.map(([cat, type]) => ({
        value: cat,
        label: getCategoryWithIcon(cat, type)
      })),
    ]
  } else if (filterType.value === 'income') {
    const incomeCategories = new Set<string>()
    transactions.value
      .filter((t) => t.type === 'income')
      .forEach((t) => {
        // Normalize "Other" to "Lainnya"
        const normalizedCat = t.category.toLowerCase().trim() === 'other' ? 'Lainnya' : t.category
        incomeCategories.add(normalizedCat)
      })
    return [
      ...baseOptions,
      ...Array.from(incomeCategories).map((cat) => ({
        value: cat,
        label: getCategoryWithIcon(cat, 'income')
      })),
    ]
  } else {
    const expenseCategories = new Set<string>()
    transactions.value
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        const lowerCat = t.category.toLowerCase().trim()
        // Exclude "Gaji" from expense categories
        if (lowerCat === 'gaji' || lowerCat === 'salary') return
        // Normalize "Other" to "Lainnya"
        const normalizedCat = lowerCat === 'other' ? 'Lainnya' : t.category
        expenseCategories.add(normalizedCat)
      })
    return [
      ...baseOptions,
      ...Array.from(expenseCategories).map((cat) => ({
        value: cat,
        label: getCategoryWithIcon(cat, 'expense')
      })),
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

  if (filterType.value !== 'all') {
    result = result.filter((t) => t.type === filterType.value)
  }

  if (filterCategory.value) {
    result = result.filter((t) => t.category === filterCategory.value)
  }

  if (filterPocketId.value) {
    const pid = filterPocketId.value
    result = result.filter((t) => t.pocketId === pid || t.transferToPocketId === pid)
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

const pocketOptions = computed(() => {
  const base = [{ value: '', label: t('transactions.allWallets') }]
  const active = getActivePockets(pocketStore.pockets, tokenStore.isLicenseActive)
  const list = active.map((p) => ({ value: p.id, label: `${p.icon} ${p.name}` }))
  return [...base, ...list]
})

const filteredSummary = computed(() => {
  const list = filteredTransactions.value.filter((t) => t.type !== 'transfer')
  const income = list.filter((t) => t.type === 'income')
  const expenses = list.filter((t) => t.type === 'expense')
  return {
    totalIncome: income.reduce((s, t) => s + t.amount, 0),
    totalExpenses: expenses.reduce((s, t) => s + t.amount, 0),
    balance: income.reduce((s, t) => s + t.amount, 0) - expenses.reduce((s, t) => s + t.amount, 0),
    incomeCount: income.length,
    expenseCount: expenses.length,
  }
})

const activeFiltersCount = computed(() => {
  let count = 0
  if (filterType.value !== 'all') count++
  if (filterCategory.value) count++
  if (filterPocketId.value) count++
  if (dateFilterType.value !== 'none') count++
  return count
})

const hasActiveFilters = computed(
  () =>
    !!searchQuery.value ||
    !!filterCategory.value ||
    filterType.value !== 'all' ||
    !!filterPocketId.value ||
    dateFilterType.value !== 'none',
)

function clearFilters() {
  searchQuery.value = ''
  filterCategory.value = ''
  filterType.value = 'all'
  filterPocketId.value = ''
  dateFilterType.value = 'none'
}

function handleEmptyStateAction() {
  if (hasActiveFilters.value) clearFilters()
  else router.push('/transactions/new')
}

const hasTransactionsToExport = computed(() => filteredTransactions.value.length > 0)

const dateFilterLabel = computed(() => {
  switch (dateFilterType.value) {
    case 'today':
      return t('transactions.today')
    case 'last7days':
      return t('transactions.last7Days')
    case 'last30days':
      return t('transactions.last30Days')
    case 'custom':
      if (customStartDate.value && customEndDate.value) {
        const dateLocale = locale.value === 'id' ? 'id-ID' : 'en-US'
        const start = new Date(customStartDate.value).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' })
        const end = new Date(customEndDate.value).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' })
        return `${start} - ${end}`
      }
      return t('transactions.customRange')
    default:
      return t('transactions.allTime')
  }
})

const dateFilterOptions = computed(() => [
  { value: 'none', label: t('transactions.allTime') },
  { value: 'today', label: t('transactions.today') },
  { value: 'last7days', label: t('transactions.last7Days') },
  { value: 'last30days', label: t('transactions.last30Days') },
  { value: 'custom', label: t('transactions.customRange') },
])

/** Group transactions by date: today, yesterday, then formatted date (e.g. 10 JAN 2026) */
const groupedByDate = computed(() => {
  const list = [...filteredTransactions.value].sort((a, b) => {
    const dateA = new Date(a.date).getTime()
    const dateB = new Date(b.date).getTime()
    if (dateB !== dateA) return dateB - dateA
    const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0
    return createdB - createdA
  })
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayEnd = new Date(today)
  todayEnd.setHours(23, 59, 59, 999)
  const yesterdayStart = new Date(today)
  yesterdayStart.setDate(yesterdayStart.getDate() - 1)
  yesterdayStart.setHours(0, 0, 0, 0)
  const yesterdayEnd = new Date(yesterdayStart)
  yesterdayEnd.setHours(23, 59, 59, 999)
  const dateLocale = locale.value === 'id' ? 'id-ID' : 'en-US'
  const groups: { sectionLabel: string; sectionKey: string; items: typeof list }[] = []
  let currentKey = ''
  let currentLabel = ''
  let currentItems: typeof list = []
  for (const tx of list) {
    const d = new Date(tx.date)
    const time = d.getTime()
    let key: string
    let label: string
    if (time >= today.getTime() && time <= todayEnd.getTime()) {
      key = 'today'
      label = t('transactions.todaySection')
    } else if (time >= yesterdayStart.getTime() && time <= yesterdayEnd.getTime()) {
      key = 'yesterday'
      label = t('transactions.yesterdaySection')
    } else {
      key = d.toISOString().slice(0, 10)
      label = d.toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()
    }
    if (key !== currentKey) {
      if (currentKey) groups.push({ sectionLabel: currentLabel, sectionKey: currentKey, items: currentItems })
      currentKey = key
      currentLabel = label
      currentItems = [tx]
    } else {
      currentItems.push(tx)
    }
  }
  if (currentKey) groups.push({ sectionLabel: currentLabel, sectionKey: currentKey, items: currentItems })
  return groups
})

function resetFilters() {
  filterType.value = 'all'
  filterCategory.value = ''
  filterPocketId.value = ''
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

async function confirmDelete() {
  if (transactionToDelete.value) {
    const idToDelete = transactionToDelete.value
    showDeleteConfirm.value = false
    transactionToDelete.value = null

    try {
      await deleteTransaction(idToDelete)
      await nextTick()
      toastStore.success(t('transactions.deleteSuccess'))
    } catch (error) {
      console.error('Error deleting transaction:', error)
      toastStore.error(t('transactions.deleteFailed'))
    }
  }
}

function handleExportXLSX() {
  if (!hasTransactionsToExport.value) {
    showExportNoDataModal.value = true
    return
  }
  const filename = `transactions-${new Date().toISOString().split('T')[0]}.xlsx`
  exportToXLSX(filteredTransactions.value, filename)
}

function handleExportPDF() {
  if (!hasTransactionsToExport.value) {
    showExportNoDataModal.value = true
    return
  }
  const filename = `transactions-${new Date().toISOString().split('T')[0]}.pdf`
  exportToPDF(filteredTransactions.value, filteredSummary.value, filename)
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

function closeExportDropdown(e?: MouseEvent) {
  if (e && exportDropdownRef.value && exportDropdownRef.value.contains(e.target as Node)) return
  showExportDropdown.value = false
}

onMounted(() => {
  pocketStore.fetchPockets()
  fetchTransactions()
  const q = route.query.pocketId
  if (q && typeof q === 'string') {
    const active = getActivePockets(pocketStore.pockets, tokenStore.isLicenseActive)
    if (active.some((p) => p.id === q)) {
      filterPocketId.value = q
    }
  }
  window.addEventListener('scroll', handleScroll)
  document.addEventListener('click', closeExportDropdown)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  document.removeEventListener('click', closeExportDropdown)
})

</script>

<template>
  <div class="mx-auto max-w-[430px] space-y-5 px-4 pb-24 pt-24">
    <PageHeader :title="t('transactions.title')" :subtitle="t('transactions.subtitle')">
      <template #right>
        <div ref="exportDropdownRef" class="relative">
          <button type="button"
            class="flex text-xs items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2  font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            :class="{ 'ring-2 ring-brand ring-offset-2 dark:ring-offset-slate-900': showExportDropdown }"
            :disabled="!hasTransactionsToExport" :title="t('transactions.exportFile')"
            @click.stop="showExportDropdown = !showExportDropdown">
            Import Data

            <span class="hidden sm:inline">{{ t('transactions.exportFile') }}</span>
            <font-awesome-icon :icon="['fas', showExportDropdown ? 'chevron-up' : 'chevron-down']"
              class="h-3 w-3 text-slate-400" />

          </button>
          <Transition enter-active-class="transition duration-150 ease-out" enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100" leave-active-class="transition duration-100 ease-in"
            leave-from-class="opacity-100 scale-100" leave-to-class="opacity-0 scale-95">
            <div v-if="showExportDropdown"
              class="absolute right-0 top-full z-50 mt-1.5 min-w-[140px] rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-600 dark:bg-slate-800">
              <button type="button"
                class="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/50"
                :disabled="!hasTransactionsToExport" @click.stop="showExportDropdown = false; handleExportXLSX()">
                <font-awesome-icon :icon="['fas', 'file-excel']" class="h-4 w-4 text-green-600 dark:text-green-400" />
                {{ t('transactions.exportExcel') }}
              </button>
              <button type="button"
                class="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/50"
                :disabled="!hasTransactionsToExport" @click.stop="showExportDropdown = false; handleExportPDF()">
                <font-awesome-icon :icon="['fas', 'file-pdf']" class="h-4 w-4 text-red-600 dark:text-red-400" />
                {{ t('transactions.exportPDF') }}
              </button>
            </div>
          </Transition>
        </div>
      </template>
    </PageHeader>

    <!-- Search -->
    <div class="relative">
      <font-awesome-icon :icon="['fas', 'search']"
        class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input v-model="searchQuery" type="text" :placeholder="t('transactions.searchPlaceholder')"
        class="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500" />
    </div>

    <!-- Filter row: Waktu, Tipe transaksi, Dompet, Kategori (scroll x) -->
    <div class="-mx-4 overflow-x-auto px-4 pb-1">
      <div class="flex gap-2" style="min-width: max-content;">
        <!-- Waktu -->
        <div class="relative shrink-0 w-[130px]">
          <font-awesome-icon :icon="['fas', 'calendar-days']"
            class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <select v-model="dateFilterType"
            class="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-8 pr-7 text-sm text-slate-700 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <option v-for="opt in dateFilterOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
          <font-awesome-icon :icon="['fas', 'chevron-down']"
            class="absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
        <!-- Tipe transaksi -->
        <div class="relative shrink-0 w-[130px]">
          <font-awesome-icon :icon="['fas', 'arrow-right-arrow-left']"
            class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <select v-model="filterType"
            class="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-8 pr-7 text-sm text-slate-700 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <option v-for="opt in typeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
          <font-awesome-icon :icon="['fas', 'chevron-down']"
            class="absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
        <!-- Dompet -->
        <div class="relative shrink-0 w-[130px]">
          <font-awesome-icon :icon="['fas', 'wallet']"
            class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <select v-model="filterPocketId"
            class="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-8 pr-7 text-sm text-slate-700 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <option v-for="opt in pocketOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
          <font-awesome-icon :icon="['fas', 'chevron-down']"
            class="absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
        <!-- Kategori -->
        <div class="relative shrink-0 w-[140px]">
          <font-awesome-icon :icon="['fas', 'layer-group']"
            class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <select v-model="filterCategory"
            class="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-8 pr-7 text-sm text-slate-700 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <option v-for="opt in categoryOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
          <font-awesome-icon :icon="['fas', 'chevron-down']"
            class="absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>
    </div>

    <!-- Custom date range (when "Custom Range" selected) -->
    <Transition enter-active-class="transition-all duration-200 ease-out" enter-from-class="opacity-0 max-h-0"
      enter-to-class="opacity-100 max-h-[200px]" leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 max-h-[200px]" leave-to-class="opacity-0 max-h-0">
      <div v-if="dateFilterType === 'custom'"
        class="overflow-hidden rounded-xl border border-slate-200 bg-white p-3 space-y-3 dark:border-slate-600 dark:bg-slate-800">
        <BaseDatePicker v-model="customStartDate" :label="t('transactions.startDate')"
          :max-date="customEndDate || undefined" />
        <BaseDatePicker v-model="customEndDate" :label="t('transactions.endDate')"
          :min-date="customStartDate || undefined" />
      </div>
    </Transition>

    <div v-if="filteredTransactions.length === 0"
      class="flex flex-col items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-12 px-6 text-center dark:border-slate-700 dark:bg-slate-800/30">
      <span
        class="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-brand/10 text-4xl text-brand dark:bg-brand/20"
        aria-hidden="true">
        <font-awesome-icon :icon="['fas', 'receipt']" class="h-10 w-10" />
      </span>
      <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">
        {{
          searchQuery || filterCategory || filterType !== 'all' || filterPocketId || dateFilterType !== 'none'
            ? t('transactions.noTransactionsFiltered')
            : t('transactions.emptyTitle')
        }}
      </h2>
      <p class="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
        {{
          searchQuery || filterCategory || filterType !== 'all' || filterPocketId || dateFilterType !== 'none'
            ? t('transactions.emptyFilteredHint')
            : t('transactions.emptySubtitle')
        }}
      </p>
      <BaseButton variant="primary" size="lg" class="mt-6" @click="handleEmptyStateAction">
        <font-awesome-icon :icon="['fas', hasActiveFilters ? 'rotate-left' : 'plus']" class="mr-2" />
        {{ hasActiveFilters ? t('transactions.clearAllFilters') : t('home.addTransaction') }}
      </BaseButton>
    </div>

    <div v-else class="space-y-6">
      <section v-for="group in groupedByDate" :key="group.sectionKey" class="space-y-2">
        <h2 class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {{ group.sectionLabel }}
        </h2>
        <div class="space-y-2">
          <TransactionCard v-for="transaction in group.items" :key="transaction.id" :transaction="transaction"
            :context-pocket-id="filterPocketId || undefined" @edit="handleEdit" @delete="handleDelete" />
        </div>
      </section>
    </div>

    <ReceiptScanner :is-open="showScanner" :categories="categories" @close="showScanner = false"
      @scan-complete="handleScanComplete" @scan-complete-multiple="handleScanCompleteMultiple" />

    <!-- Export no-data alert -->
    <AlertModal :is-open="showExportNoDataModal" :title="t('transactions.exportNoDataTitle')"
      :message="t('transactions.exportNoDataMessage')" variant="info" @close="showExportNoDataModal = false" />

    <!-- Delete Confirmation Modal -->
    <ConfirmModal :is-open="showDeleteConfirm" :title="t('transactions.deleteTransaction')"
      :message="t('transactions.deleteTransactionConfirm')" :confirm-text="t('common.delete')"
      :cancel-text="t('common.cancel')" variant="danger" :icon="['fas', 'trash']" @confirm="confirmDelete"
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
