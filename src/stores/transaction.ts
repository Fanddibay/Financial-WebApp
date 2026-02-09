import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Transaction, TransactionFormData, TransactionFilters, TransactionSummary } from '@/types/transaction'
import { transactionService, computePocketBalances } from '@/services/transactionService'

export const useTransactionStore = defineStore('transaction', () => {
  const transactions = ref<Transaction[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const pocketBalances = computed(() => computePocketBalances(transactions.value))

  // Summary excludes transfers (income/expense only)
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

  const categories = computed(() => {
    const cats = new Set<string>()
    transactions.value.forEach((t) => {
      if (t.type !== 'transfer' && t.category) cats.add(t.category)
    })
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

  async function createTransaction(data: TransactionFormData) {
    // Prevent expense from making pocket balance negative
    if (data.type === 'expense' && data.pocketId) {
      const balance = pocketBalances.value[data.pocketId] ?? 0
      if (data.amount > balance) {
        const err = new Error('INSUFFICIENT_POCKET_BALANCE') as Error & {
          currentBalance: number
          amount: number
        }
        err.currentBalance = balance
        err.amount = data.amount
        throw err
      }
    }

    loading.value = true
    error.value = null
    try {
      const transaction = await transactionService.create(data)
      transactions.value.push(transaction)
      try {
        window.dispatchEvent(new CustomEvent('check-transaction-notification'))
      } catch {
        // ignore
      }
      return transaction
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Gagal membuat transaksi'
      console.error('Error creating transaction:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function createTransfer(fromPocketId: string, toPocketId: string, amount: number) {
    loading.value = true
    error.value = null
    try {
      const tx = await transactionService.createTransfer(fromPocketId, toPocketId, amount)
      transactions.value.push(tx)
      try {
        window.dispatchEvent(new CustomEvent('check-transaction-notification'))
      } catch {
        // ignore
      }
      return tx
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Gagal memindahkan uang'
      console.error('Error creating transfer:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function createTransferToGoal(fromPocketId: string, toGoalId: string, amount: number) {
    loading.value = true
    error.value = null
    try {
      const tx = await transactionService.createTransferToGoal(fromPocketId, toGoalId, amount)
      transactions.value.push(tx)
      try {
        window.dispatchEvent(new CustomEvent('check-transaction-notification'))
      } catch {
        // ignore
      }
      return tx
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Gagal mengalokasikan uang ke goal'
      console.error('Error creating transfer to goal:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function createWithdrawalFromGoal(fromGoalId: string, toPocketId: string, amount: number) {
    loading.value = true
    error.value = null
    try {
      const tx = await transactionService.createWithdrawalFromGoal(fromGoalId, toPocketId, amount)
      transactions.value.push(tx)
      try {
        window.dispatchEvent(new CustomEvent('check-transaction-notification'))
      } catch {
        // ignore
      }
      return tx
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Gagal menarik uang dari goal'
      console.error('Error creating withdrawal from goal:', err)
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

  // Delete all transactions for a pocket (used when deleting a pocket).
  // Service converts transfers out to income in target pocket so balances are preserved.
  async function deleteByPocketId(pocketId: string) {
    loading.value = true
    error.value = null
    try {
      await transactionService.deleteByPocketId(pocketId)
      transactions.value = await transactionService.getAll()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Gagal menghapus transaksi kantong'
      console.error('Error deleting transactions by pocket:', err)
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
    pocketBalances,
    fetchTransactions,
    createTransaction,
    createTransfer,
    createTransferToGoal,
    createWithdrawalFromGoal,
    updateTransaction,
    deleteTransaction,
    deleteByPocketId,
    fetchFilteredTransactions,
    getTransactionById,
  }
})

