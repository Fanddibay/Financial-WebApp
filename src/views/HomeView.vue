<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
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

const router = useRouter()
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

// Transaction notification
const newTransaction = ref<TransactionFormData | null>(null)
const showTransactionNotification = ref(false)

const typeOptions = [
  { value: 'all', label: 'Semua' },
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
]

const filteredTransactionsByCategory = computed(() => {
  if (selectedType.value === 'income') {
    return incomeTransactionsByCategory.value
  } else if (selectedType.value === 'expense') {
    return transactionsByCategory.value
  } else {
    // Combine both income and expense, prefixing category names to avoid conflicts
    const combined = [
      ...incomeTransactionsByCategory.value.map(item => ({
        ...item,
        category: `${item.category} (Income)`,
      })),
      ...transactionsByCategory.value.map(item => ({
        ...item,
        category: `${item.category} (Expense)`,
      })),
    ]
    return combined.sort((a, b) => b.total - a.total)
  }
})

const incomeTotal = computed(() => {
  return incomeTransactionsByCategory.value.reduce((sum, item) => sum + item.total, 0)
})

const expenseTotal = computed(() => {
  return transactionsByCategory.value.reduce((sum, item) => sum + item.total, 0)
})

const totalAmount = computed(() => {
  if (selectedType.value === 'income') {
    return incomeTotal.value
  } else if (selectedType.value === 'expense') {
    return expenseTotal.value
  } else {
    // Calculate balance (income - expense)
    return incomeTotal.value - expenseTotal.value
  }
})

const isBalanceNegative = computed(() => {
  return selectedType.value === 'all' && totalAmount.value < 0
})

const chartTitle = computed(() => {
  if (selectedType.value === 'income') return 'Rincian Income'
  if (selectedType.value === 'expense') return 'Rincian Expense'
  return 'Rincian Keuangan'
})

const chartSubtitle = computed(() => {
  if (selectedType.value === 'income') return 'Lihat dari mana uang kamu masuk'
  if (selectedType.value === 'expense') return 'Lihat kemana uang kamu keluar'
  return 'Lihat income dan expense kamu'
})

const totalLabel = computed(() => {
  if (selectedType.value === 'income') return 'Total income'
  if (selectedType.value === 'expense') return 'Total expense'
  return 'Saldo'
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

onMounted(() => {
  fetchTransactions()

  // Check for new transaction in sessionStorage
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
})

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('id-ID', {
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
          <div>
            <h2 class="text-sm font-semibold text-slate-900 dark:text-slate-100">{{ chartTitle }}</h2>
            <p class="text-xs text-slate-500 dark:text-slate-400">{{ chartSubtitle }}</p>
          </div>
          <div class="!text-xs">
            <BaseSelect v-model="selectedType" :options="typeOptions" />
          </div>
        </div>
      </template>
      <div v-if="filteredTransactionsByCategory.length > 0">
        <ExpenseChart :transactions-by-category="filteredTransactionsByCategory" :total-expenses="totalAmount"
          :label="selectedType === 'all' ? 'Saldo' : totalLabel" :is-negative="isBalanceNegative"
          :is-expense="selectedType === 'expense'" />
        <div class="mt-6 text-center">
          <p class="text-sm text-slate-500">{{ totalLabel }}</p>
          <div class="flex gap-4 mx-auto justify-center items-center">
            <p :class="[
              'text-2xl font-bold',
              isBalanceNegative
                ? 'text-red-600 dark:text-red-400'
                : 'text-slate-900 dark:text-slate-100'
            ]">
              {{ displayTotal }}
            </p>
            <button
              class="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-brand/40 hover:text-brand dark:border-slate-700 dark:text-slate-400"
              type="button" @click="showTotals = !showTotals">
              <font-awesome-icon :icon="['fas', showTotals ? 'eye-slash' : 'eye']" />
            </button>
          </div>
        </div>
      </div>
      <div v-else class="py-12 text-center text-slate-500">
        <p>Belum ada transaksi nih. Tambahkan transaksi dulu untuk lihat rinciannya!</p>
      </div>
    </BaseCard>

    <!-- Financial Insight Card -->
    <FinancialInsightCard :total-income="currentMonthIncome" :total-expenses="currentMonthExpenses" />

    <!-- Latest Transactions -->
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">Transaksi Terbaru</h2>
      <router-link to="/transactions" class="text-sm text-brand hover:underline">
        Lihat Semua
      </router-link>
    </div>

    <div v-if="recentTransactions.length === 0" class="py-8 text-center text-slate-500 dark:text-slate-400">
      <p>Belum ada transaksi nih. Yuk mulai catat transaksi pertama kamu!</p>
      <router-link to="/transactions/new" class="mt-4 inline-block">
        <BaseButton>
          <font-awesome-icon :icon="['fas', 'plus']" class="mr-2" />
          Tambah Transaksi
        </BaseButton>
      </router-link>
    </div>

    <div v-else class="space-y-3">
      <TransactionCard v-for="transaction in recentTransactions" :key="transaction.id" :transaction="transaction"
        @edit="handleEdit" @delete="handleDelete" />
    </div>

    <!-- Delete Confirmation Modal -->
    <ConfirmModal :is-open="showDeleteConfirm" title="Hapus Transaksi"
      message="Yakin mau hapus transaksi ini? Tindakan ini tidak bisa dibatalkan." confirm-text="Hapus"
      cancel-text="Batal" variant="danger" :icon="['fas', 'trash']" @confirm="confirmDelete"
      @close="showDeleteConfirm = false" />

    <!-- Transaction Success Notification -->
    <Transition enter-active-class="transition-all duration-300 ease-out" enter-from-class="opacity-0 translate-y-2"
      enter-to-class="opacity-100 translate-y-0" leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0" leave-to-class="opacity-0 translate-y-2">
      <div v-if="showTransactionNotification && newTransaction" :class="[
        'fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-lg px-4 py-4 shadow-xl max-w-[90%] w-full max-w-md',
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
            <font-awesome-icon :icon="['fas', newTransaction.type === 'income' ? 'arrow-up' : 'arrow-down']" :class="[
              'text-lg',
              newTransaction.type === 'income'
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400',
            ]" />
          </div>
          <div class="flex-1">
            <div class="flex items-center justify-between mb-1">
              <h3 :class="[
                'font-semibold text-sm',
                newTransaction.type === 'income'
                  ? 'text-green-800 dark:text-green-300'
                  : 'text-red-800 dark:text-red-300',
              ]">
                Transaksi {{ newTransaction.type === 'income' ? 'Income' : 'Expense' }} Berhasil Ditambahkan!
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
