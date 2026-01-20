<script setup lang="ts">
import { computed, onMounted, onActivated, onUnmounted, ref, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useRouter } from 'vue-router'
import { useTransactions } from '@/composables/useTransactions'
import ExpenseChart from '@/components/charts/ExpenseChart.vue'
import FinancialInsightCard from '@/components/charts/FinancialInsightCard.vue'
import TransactionCard from '@/components/transactions/TransactionCard.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { formatIDR } from '@/utils/currency'
import type { TransactionFormData } from '@/types/transaction'
import { getCategoryIcon } from '@/utils/categoryIcons'
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()
const router = useRouter()
const route = useRoute()
const {
  transactions,
  transactionsByCategory,
  incomeTransactionsByCategory,
  recentTransactions,
  fetchTransactions,
  deleteTransaction,
} = useTransactions()

const selectedType = ref<'income' | 'expense' | 'all'>('all')
const showTotals = ref(true)
const showDeleteConfirm = ref(false)
const transactionToDelete = ref<string | null>(null)
const hiddenCategories = ref<Set<string>>(new Set())

// Chart colors matching ExpenseChart component
const colors = [
  '#10b981', // green-500
  '#3b82f6', // blue-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#84cc16', // lime-500
]

// Transaction notification
const newTransaction = ref<TransactionFormData | null>(null)
const showTransactionNotification = ref(false)

const typeOptions = computed(() => [
  { value: 'all', label: t('common.all') },
  { value: 'income', label: t('transaction.incomeLabel') },
  { value: 'expense', label: t('transaction.expenseLabel') },
])

// All categories (for display in breakdown)
const allCategories = computed(() => {
  if (selectedType.value === 'income') {
    return incomeTransactionsByCategory.value
  } else if (selectedType.value === 'expense') {
    return transactionsByCategory.value
  } else {
    // Combine both income and expense, prefixing category names to avoid conflicts
    const combined = [
      ...incomeTransactionsByCategory.value.map(item => ({
        ...item,
        category: `${item.category} (${t('transaction.incomeLabel')})`,
      })),
      ...transactionsByCategory.value.map(item => ({
        ...item,
        category: `${item.category} (${t('transaction.expenseLabel')})`,
      })),
    ]
    return combined.sort((a, b) => b.total - a.total)
  }
})

// Filtered categories (for chart display)
const filteredTransactionsByCategory = computed(() => {
  // Filter out hidden categories
  return allCategories.value.filter(item => !hiddenCategories.value.has(item.category))
})

const totalAmount = computed(() => {
  // Calculate total from visible categories only
  const visibleTotal = filteredTransactionsByCategory.value.reduce((sum, item) => sum + item.total, 0)

  if (selectedType.value === 'income') {
    return visibleTotal
  } else if (selectedType.value === 'expense') {
    return visibleTotal
  } else {
    // For 'all', we need to recalculate balance considering hidden categories
    const incomeLabel = `(${t('transaction.incomeLabel')})`
    const expenseLabel = `(${t('transaction.expenseLabel')})`
    const visibleIncome = filteredTransactionsByCategory.value
      .filter(item => item.category.includes(incomeLabel))
      .reduce((sum, item) => sum + item.total, 0)
    const visibleExpense = filteredTransactionsByCategory.value
      .filter(item => item.category.includes(expenseLabel))
      .reduce((sum, item) => sum + item.total, 0)
    return visibleIncome - visibleExpense
  }
})

function toggleCategory(category: string) {
  if (hiddenCategories.value.has(category)) {
    hiddenCategories.value.delete(category)
  } else {
    hiddenCategories.value.add(category)
  }
  // Create new Set to trigger reactivity
  hiddenCategories.value = new Set(hiddenCategories.value)
}

const getCategoryColor = (index: number) => {
  return colors[index % colors.length]
}

// Helper function to get category icon
function getCategoryIconForDisplay(category: string): string {
  // Check if it's combined format "Category (Income)" or "Category (Expense)"
  const incomeLabel = `(${t('transaction.incomeLabel')})`
  const expenseLabel = `(${t('transaction.expenseLabel')})`
  if (category.includes(incomeLabel)) {
    const baseCategory = category.replace(` ${incomeLabel}`, '').trim()
    return getCategoryIcon(baseCategory, 'income')
  } else if (category.includes(expenseLabel)) {
    const baseCategory = category.replace(` ${expenseLabel}`, '').trim()
    return getCategoryIcon(baseCategory, 'expense')
  }
  
  // Determine type based on selectedType
  if (selectedType.value === 'income') {
    return getCategoryIcon(category, 'income')
  } else if (selectedType.value === 'expense') {
    return getCategoryIcon(category, 'expense')
  }
  
  // Default to expense for 'all' type if can't determine
  return getCategoryIcon(category, 'expense')
}

const isBalanceNegative = computed(() => {
  return selectedType.value === 'all' && totalAmount.value < 0
})

// Check if there are NO transactions at all (true no transaction state)
const hasNoTransactions = computed(() => {
  return allCategories.value.length === 0
})

// Check if all filters are hidden (filtered empty state)
const allFiltersHidden = computed(() => {
  return allCategories.value.length > 0 && filteredTransactionsByCategory.value.length === 0
})

// Check if chart should be disabled (all filters hidden)
const isChartDisabled = computed(() => {
  return allFiltersHidden.value
})

const chartTitle = computed(() => {
  if (selectedType.value === 'income') return t('home.chartTitleIncome')
  if (selectedType.value === 'expense') return t('home.chartTitleExpense')
  return t('home.chartTitleAll')
})

const chartSubtitle = computed(() => {
  if (selectedType.value === 'income') return t('home.chartSubtitleIncome')
  if (selectedType.value === 'expense') return t('home.chartSubtitleExpense')
  return t('home.chartSubtitleAll')
})

const totalLabel = computed(() => {
  if (selectedType.value === 'income') return t('home.totalIncome')
  if (selectedType.value === 'expense') return t('home.totalExpense')
  return t('home.balance')
})

const displayTotal = computed(() => (showTotals.value ? formatIDR(totalAmount.value) : '••••••••'))

// Calculate current month totals for insight card
const currentMonthIncome = computed(() => {
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  return transactions.value
    .filter((t) => {
      const transactionDate = new Date(t.date)
      return (
        t.type === 'income' &&
        transactionDate.getMonth() === currentMonth &&
        transactionDate.getFullYear() === currentYear
      )
    })
    .reduce((sum, t) => sum + t.amount, 0)
})

const currentMonthExpenses = computed(() => {
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  return transactions.value
    .filter((t) => {
      const transactionDate = new Date(t.date)
      return (
        t.type === 'expense' &&
        transactionDate.getMonth() === currentMonth &&
        transactionDate.getFullYear() === currentYear
      )
    })
    .reduce((sum, t) => sum + t.amount, 0)
})

// Function to check and show notification from sessionStorage
function checkAndShowNotification() {
  const storedTransaction = sessionStorage.getItem('newTransaction')
  if (storedTransaction) {
    try {
      newTransaction.value = JSON.parse(storedTransaction)
      showTransactionNotification.value = true
      sessionStorage.removeItem('newTransaction')

      // Auto hide after 5 seconds
      setTimeout(() => {
        showTransactionNotification.value = false
      }, 5000)
    } catch (error) {
      console.error('Error parsing transaction data:', error)
    }
  }
}

onMounted(() => {
  fetchTransactions()
  checkAndShowNotification()

  // Listen for custom event to check notification (for when already on homepage)
  window.addEventListener('check-transaction-notification', checkAndShowNotification)
})

onUnmounted(() => {
  // Cleanup event listener
  window.removeEventListener('check-transaction-notification', checkAndShowNotification)
})

// onActivated is called when component is activated (useful with keep-alive)
onActivated(() => {
  // Check for notification every time component is activated
  checkAndShowNotification()
})

// Watch route changes to check for notification when navigating to homepage
// This ensures notification is shown even if component is already mounted
watch(
  () => route.path,
  (newPath, oldPath) => {
    // Check when navigating TO homepage (not when leaving)
    if (newPath === '/' && oldPath !== '/') {
      // When navigating to homepage, check for notification
      // Use multiple checks with delays to ensure we catch the sessionStorage
      // This handles cases where component is already mounted or navigation is fast
      nextTick(() => {
        // First check immediately
        checkAndShowNotification()
        
        // Also check after a short delay to catch async sessionStorage writes
        setTimeout(() => {
          checkAndShowNotification()
        }, 100)
        
        // Final check after longer delay (for very slow writes)
        setTimeout(() => {
          checkAndShowNotification()
        }, 500)
      })
    }
  },
  { immediate: false }
)


function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const dateLocale = locale.value === 'id' ? 'id-ID' : 'en-US'
  return date.toLocaleDateString(dateLocale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function closeNotification() {
  showTransactionNotification.value = false
  newTransaction.value = null
}

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
</script>

<template>
  <div class="mx-auto max-w-[430px] space-y-6 px-4 pb-24 pt-8">
    <!-- Chart Section -->
    <BaseCard>
      <template #header>
        <div class="flex items-center justify-between gap-3">
          <div class="flex-1 min-w-0">
            <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">{{ chartTitle }}</h2>
            <p class="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{{ chartSubtitle }}</p>
          </div>
          <div class="flex-shrink-0">
            <BaseSelect v-model="selectedType" :options="typeOptions" />
          </div>
        </div>
      </template>

      <!-- No Transaction State: benar-benar tidak ada transaksi -->
      <div v-if="hasNoTransactions" class="py-16 text-center">
        <div
          class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
          <font-awesome-icon :icon="['fas', 'chart-pie']" class="text-2xl text-slate-400 dark:text-slate-500" />
        </div>
        <p class="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">{{ t('home.noTransactions') }}</p>
        <p class="text-xs text-slate-500 dark:text-slate-500">{{ t('home.noTransactionsDesc') }}
        </p>
      </div>

      <!-- Chart State: ada transaksi (baik filtered atau tidak) -->
      <div v-else class="space-y-6">
        <!-- Chart with centered total -->
        <div class="relative" :class="{ 'opacity-50 grayscale': isChartDisabled }">
          <ExpenseChart
            :transactions-by-category="filteredTransactionsByCategory.length > 0 ? filteredTransactionsByCategory : []"
            :all-categories-for-color-mapping="allCategories"
            :total-expenses="isChartDisabled ? 0 : totalAmount" :label="selectedType === 'all' ? t('home.balance') : totalLabel"
            :is-negative="isBalanceNegative" :is-expense="selectedType === 'expense'"
            :hidden-categories="hiddenCategories" :disabled="isChartDisabled" />

          <!-- Filtered Empty State Hint -->
          <div v-if="isChartDisabled" class="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div class="bg-white/90 dark:bg-slate-800/90 rounded-lg px-4 py-2 shadow-sm">
              <p class="text-xs font-medium text-slate-500 dark:text-slate-400 text-center">
                {{ t('home.noDataSelected') }}
              </p>
            </div>
          </div>
        </div>

        <!-- Total Amount Display -->
        <div class="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-4 dark:bg-slate-800/50"
          :class="{ 'opacity-50': isChartDisabled }">
          <div class="flex-1">
            <p class="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{{ totalLabel }}</p>
            <p :class="[
              'text-2xl font-bold',
              isChartDisabled
                ? 'text-slate-400 dark:text-slate-500'
                : isBalanceNegative
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-slate-900 dark:text-slate-100'
            ]">
              {{ isChartDisabled ? formatIDR(0) : displayTotal }}
            </p>
          </div>
          <button
            class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-brand/40 hover:bg-brand/5 hover:text-brand dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-brand/40"
            type="button" @click="showTotals = !showTotals"
            :aria-label="showTotals ? t('home.hideBalance') : t('home.showBalance')">
            <font-awesome-icon :icon="['fas', showTotals ? 'eye-slash' : 'eye']" class="h-5 w-5" />
          </button>
        </div>

        <!-- Category Breakdown - Always visible and interactive when there are transactions -->
        <div v-if="allCategories.length > 0" class="space-y-3">
          <div class="flex items-center justify-between">
            <p class="text-sm font-semibold text-slate-700 dark:text-slate-300">{{ t('home.categoryBreakdown') }}</p>
            <button v-if="hiddenCategories.size > 0" @click="hiddenCategories = new Set()"
              class="text-xs text-brand hover:underline font-medium" type="button">
              {{ t('home.showAll') }}
            </button>
            <button v-else-if="allFiltersHidden" @click="hiddenCategories = new Set()"
              class="text-xs text-slate-500 hover:text-brand hover:underline font-medium" type="button">
              {{ t('home.resetFilter') }}
            </button>
          </div>
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <button v-for="(item, index) in allCategories" :key="item.category" @click="toggleCategory(item.category)"
              :class="[
                'group relative rounded-xl border-2 p-3 text-left transition-all',
                'hover:scale-105 hover:shadow-md active:scale-95',
                hiddenCategories.has(item.category)
                  ? 'border-slate-200 bg-slate-50/50 opacity-50 dark:border-slate-700 dark:bg-slate-800/30'
                  : 'border-slate-200 bg-white hover:border-brand/40 hover:bg-brand/5 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-brand/40'
              ]" type="button">
              <!-- Color indicator -->
              <div class="mb-2 h-2 w-full rounded-full" :style="{ backgroundColor: getCategoryColor(index) }"></div>

              <!-- Category icon and name (top) -->
              <div class="flex items-center gap-1.5 mb-1.5">
                <span class="text-sm">{{ getCategoryIconForDisplay(item.category) }}</span>
                <p :class="[
                  'text-[10px] font-semibold line-clamp-2 flex-1',
                  hiddenCategories.has(item.category)
                    ? 'text-slate-400 dark:text-slate-500'
                    : 'text-slate-700 dark:text-slate-300'
                ]">
                  {{ item.category }}
                </p>
              </div>

              <!-- Amount (bottom) -->
              <p :class="[
                'text-xs font-bold',
                hiddenCategories.has(item.category)
                  ? 'text-slate-400 dark:text-slate-500'
                  : 'text-slate-900 dark:text-slate-100'
              ]">
                {{ formatIDR(item.total) }}
              </p>

              <!-- Toggle indicator -->
              <div class="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full transition"
                :class="[
                  hiddenCategories.has(item.category)
                    ? 'bg-slate-200 text-slate-400 dark:bg-slate-700 dark:text-slate-500 opacity-100'
                    : 'bg-brand/10 text-brand opacity-0 group-hover:opacity-100 dark:bg-brand/20'
                ]">
                <font-awesome-icon :icon="['fas', hiddenCategories.has(item.category) ? 'eye-slash' : 'eye']"
                  class="h-3 w-3" />
              </div>
            </button>
          </div>
        </div>
      </div>

    </BaseCard>

    <!-- Financial Insight Card -->
    <FinancialInsightCard :total-income="currentMonthIncome" :total-expenses="currentMonthExpenses" />

    <!-- Latest Transactions -->
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">{{ t('home.latestTransactions') }}</h2>
      <router-link to="/transactions" class="text-sm text-brand hover:underline">
        {{ t('home.viewAll') }}
      </router-link>
    </div>

    <div v-if="recentTransactions.length === 0" class="py-8 text-center text-slate-500 dark:text-slate-400">
      <p>{{ t('home.noRecentTransactions') }}</p>
      <router-link to="/transactions/new" class="mt-4 inline-block">
        <BaseButton>
          <font-awesome-icon :icon="['fas', 'plus']" class="mr-2" />
          {{ t('home.addTransaction') }}
        </BaseButton>
      </router-link>
    </div>

    <div v-else class="space-y-3">
      <TransactionCard v-for="transaction in recentTransactions" :key="transaction.id" :transaction="transaction"
        @edit="handleEdit" @delete="handleDelete" />
    </div>

    <!-- Delete Confirmation Modal -->
    <ConfirmModal :is-open="showDeleteConfirm" :title="t('home.deleteTransaction')"
      :message="t('home.deleteTransactionConfirm')" :confirm-text="t('common.delete')"
      :cancel-text="t('common.cancel')" variant="danger" :icon="['fas', 'trash']" @confirm="confirmDelete"
      @close="showDeleteConfirm = false" />

    <!-- Transaction Success Notification -->
    <Transition enter-active-class="transition-all duration-300 ease-out" enter-from-class="opacity-0 translate-y-2"
      enter-to-class="opacity-100 translate-y-0" leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0" leave-to-class="opacity-0 translate-y-2">
      <div v-if="showTransactionNotification && newTransaction" :class="[
        'fixed bottom-24 left-1/2 z-50 -translate-x-1/2 w-full max-w-md rounded-lg px-4 py-4 shadow-xl',
        newTransaction.type === 'income'
          ? 'bg-green-50 border-2 border-green-200 dark:bg-green-900/20 dark:border-green-800'
          : 'bg-red-50 border-2 border-red-200 dark:bg-red-900/20 dark:border-red-800',
      ]">
        <div class="flex items-start gap-3">
          <div :class="[
            'flex h-10 w-10 items-center justify-center rounded-full',
            newTransaction.type === 'income'
              ? 'bg-green-100 dark:bg-green-900/30'
              : 'bg-red-100 dark:bg-red-900/30',
          ]">
            <font-awesome-icon 
              v-if="(newTransaction as any).source === 'scanner'"
              :icon="['fas', 'camera']" 
              :class="[
                'text-lg',
                newTransaction.type === 'income'
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400',
              ]" 
            />
            <font-awesome-icon 
              v-else
              :icon="['fas', newTransaction.type === 'income' ? 'arrow-up' : 'arrow-down']" 
              :class="[
                'text-lg',
                newTransaction.type === 'income'
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400',
              ]" 
            />
          </div>
          <div class="flex-1">
            <div class="flex items-center justify-between mb-1">
              <h3 :class="[
                'font-semibold text-sm',
                newTransaction.type === 'income'
                  ? 'text-green-800 dark:text-green-300'
                  : 'text-red-800 dark:text-red-300',
              ]">
                <span v-if="(newTransaction as any).source === 'scanner' && (newTransaction as any).count">
                  {{ t('home.transactionsAddedFromScanner', { count: (newTransaction as any).count }) }}
                </span>
                <span v-else-if="(newTransaction as any).source === 'scanner'">
                  {{ t('home.transactionAddedFromScanner') }}
                </span>
                <span v-else>
                  {{ newTransaction.type === 'income' ? t('home.transactionAddedIncome') : t('home.transactionAddedExpense') }}
                </span>
              </h3>
              <button @click="closeNotification" :class="[
                'rounded-lg p-1 transition',
                newTransaction.type === 'income'
                  ? 'text-green-600 hover:bg-green-100 dark:text-green-400 dark:hover:bg-green-900/30'
                  : 'text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30',
              ]">
                <font-awesome-icon :icon="['fas', 'times']" class="h-4 w-4" />
              </button>
            </div>
            <div :class="[
              'space-y-1 text-sm',
              newTransaction.type === 'income'
                ? 'text-green-700 dark:text-green-300'
                : 'text-red-700 dark:text-red-300',
            ]">
              <p class="font-medium">{{ newTransaction.description }}</p>
              <div class="flex items-center gap-4 text-xs">
                <span class="font-semibold">{{ formatIDR(newTransaction.amount) }}</span>
                <span>•</span>
                <span>{{ newTransaction.category }}</span>
                <span>•</span>
                <span>{{ formatDate(newTransaction.date) }}</span>
                <span v-if="(newTransaction as any).source === 'scanner'" class="flex items-center gap-1">
                  <span>•</span>
                  <font-awesome-icon :icon="['fas', 'camera']" class="h-3 w-3" />
                  <span>{{ t('home.scanner') }}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
