import { computed } from 'vue'
import { useTransactionStore } from '@/stores/transaction'
import type { TransactionFormData } from '@/types/transaction'

/**
 * Composable for transaction operations
 * This abstraction allows easy migration from Pinia store to backend API
 */
export function useTransactions() {
  const store = useTransactionStore()

  // Expose store state
  const transactions = computed(() => store.transactions)
  const loading = computed(() => store.loading)
  const error = computed(() => store.error)
  const summary = computed(() => store.summary)
  const categories = computed(() => store.categories)

  // Transaction operations
  const fetchTransactions = () => store.fetchTransactions()
  const createTransaction = (data: TransactionFormData) => store.createTransaction(data)
  const updateTransaction = (id: string, data: Partial<TransactionFormData>) => store.updateTransaction(id, data)
  const deleteTransaction = (id: string) => store.deleteTransaction(id)
  const getTransactionById = (id: string) => store.getTransactionById(id)

  // Computed helpers
  const incomeTransactions = computed(() => 
    transactions.value.filter((t) => t.type === 'income')
  )

  const expenseTransactions = computed(() => 
    transactions.value.filter((t) => t.type === 'expense')
  )

  const transactionsByCategory = computed(() => {
    const grouped = new Map<string, { total: number; count: number }>()
    
    expenseTransactions.value.forEach((t) => {
      const existing = grouped.get(t.category) || { total: 0, count: 0 }
      grouped.set(t.category, {
        total: existing.total + t.amount,
        count: existing.count + 1,
      })
    })
    
    return Array.from(grouped.entries()).map(([category, data]) => ({
      category,
      ...data,
    })).sort((a, b) => b.total - a.total)
  })

  const incomeTransactionsByCategory = computed(() => {
    const grouped = new Map<string, { total: number; count: number }>()
    
    incomeTransactions.value.forEach((t) => {
      const existing = grouped.get(t.category) || { total: 0, count: 0 }
      grouped.set(t.category, {
        total: existing.total + t.amount,
        count: existing.count + 1,
      })
    })
    
    return Array.from(grouped.entries()).map(([category, data]) => ({
      category,
      ...data,
    })).sort((a, b) => b.total - a.total)
  })

  // Helper function to get transactions by category with type filter
  const getTransactionsByCategory = (type: 'all' | 'income' | 'expense') => {
    const filtered = type === 'all' 
      ? transactions.value
      : type === 'income'
      ? incomeTransactions.value
      : expenseTransactions.value

    const grouped = new Map<string, { total: number; count: number }>()
    
    filtered.forEach((t) => {
      const existing = grouped.get(t.category) || { total: 0, count: 0 }
      grouped.set(t.category, {
        total: existing.total + t.amount,
        count: existing.count + 1,
      })
    })
    
    return Array.from(grouped.entries()).map(([category, data]) => ({
      category,
      ...data,
    })).sort((a, b) => b.total - a.total)
  }

  const recentTransactions = computed(() => 
    [...transactions.value]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)
  )

  return {
    // State
    transactions,
    loading,
    error,
    summary,
    categories,
    
    // Computed
    incomeTransactions,
    expenseTransactions,
    transactionsByCategory,
    incomeTransactionsByCategory,
    recentTransactions,
    
    // Methods
    fetchTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    getTransactionById,
    getTransactionsByCategory,
  }
}

