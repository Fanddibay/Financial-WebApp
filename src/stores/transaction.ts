import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Transaction, TransactionFormData, TransactionFilters, TransactionSummary } from '@/types/transaction'
import { transactionService } from '@/services/transactionService'

export const useTransactionStore = defineStore('transaction', () => {
  const transactions = ref<Transaction[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Computed summary
  const summary = computed<TransactionSummary>(() => {
    const income = transactions.value.filter((t) => t.type === 'income')
    const expenses = transactions.value.filter((t) => t.type === 'expense')

    return {
      totalIncome: income.reduce((sum, t) => sum + t.amount, 0),
      totalExpenses: expenses.reduce((sum, t) => sum + t.amount, 0),
      balance: income.reduce((sum, t) => sum + t.amount, 0) - expenses.reduce((sum, t) => sum + t.amount, 0),
      incomeCount: income.length,
      expenseCount: expenses.length,
    }
  })

  // Get unique categories
  const categories = computed(() => {
    const cats = new Set<string>()
    transactions.value.forEach((t) => cats.add(t.category))
    return Array.from(cats).sort()
  })

  // Fetch all transactions
  async function fetchTransactions() {
    loading.value = true
    error.value = null
    try {
      transactions.value = await transactionService.getAll()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Gagal mengambil data transaksi'
      console.error('Error fetching transactions:', err)
    } finally {
      loading.value = false
    }
  }

  // Create transaction
  async function createTransaction(data: TransactionFormData) {
    loading.value = true
    error.value = null
    try {
      const transaction = await transactionService.create(data)
      transactions.value.push(transaction)
      return transaction
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Gagal membuat transaksi'
      console.error('Error creating transaction:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Update transaction
  async function updateTransaction(id: string, data: Partial<TransactionFormData>) {
    loading.value = true
    error.value = null
    try {
      const updated = await transactionService.update(id, data)
      const index = transactions.value.findIndex((t) => t.id === id)
      if (index !== -1) {
        transactions.value[index] = updated
      }
      return updated
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Gagal mengupdate transaksi'
      console.error('Error updating transaction:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Delete transaction
  async function deleteTransaction(id: string) {
    loading.value = true
    error.value = null
    try {
      await transactionService.delete(id)
      transactions.value = transactions.value.filter((t) => t.id !== id)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Gagal menghapus transaksi'
      console.error('Error deleting transaction:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Get transactions by filters
  async function fetchFilteredTransactions(filters: TransactionFilters) {
    loading.value = true
    error.value = null
    try {
      return await transactionService.getByFilters(filters)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Gagal mengambil transaksi yang difilter'
      console.error('Error fetching filtered transactions:', err)
      return []
    } finally {
      loading.value = false
    }
  }

  // Get transaction by ID
  function getTransactionById(id: string): Transaction | undefined {
    return transactions.value.find((t) => t.id === id)
  }

  return {
    transactions,
    loading,
    error,
    summary,
    categories,
    fetchTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    fetchFilteredTransactions,
    getTransactionById,
  }
})

