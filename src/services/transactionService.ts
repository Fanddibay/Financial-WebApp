import type { Transaction, TransactionFormData, TransactionFilters } from '@/types/transaction'
import { MAIN_POCKET_ID } from '@/services/pocketService'

/**
 * Transaction Service Interface
 * This service layer abstracts data operations, making it easy to swap
 * localStorage for a backend API (Supabase, REST, etc.)
 */
export interface ITransactionService {
  getAll(): Promise<Transaction[]>
  getById(id: string): Promise<Transaction | null>
  create(data: TransactionFormData): Promise<Transaction>
  createTransfer(fromPocketId: string, toPocketId: string, amount: number): Promise<Transaction>
  update(id: string, data: Partial<TransactionFormData>): Promise<Transaction>
  delete(id: string): Promise<void>
  deleteByPocketId(pocketId: string): Promise<void>
  getByFilters(filters: TransactionFilters): Promise<Transaction[]>
  migratePocketIds(mainPocketId: string): void
}

const STORAGE_KEY = 'financial_tracker_transactions'

/**
 * Generates a unique ID for transactions
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * LocalStorage Transaction Service
 * Implements ITransactionService using localStorage
 * Can be easily replaced with an API service
 */
class LocalStorageTransactionService implements ITransactionService {
  private getTransactions(): Transaction[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      const parsed = stored ? JSON.parse(stored) : []
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  private saveTransactions(transactions: Transaction[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions))
  }

  migratePocketIds(mainPocketId: string): void {
    const list = this.getTransactions()
    let changed = false
    const migrated = list.map((t) => {
      const tx = t as Transaction & { pocketId?: string }
      if (tx.pocketId) return t
      changed = true
      return { ...t, pocketId: mainPocketId } as Transaction
    })
    if (changed) this.saveTransactions(migrated)
  }

  async getAll(): Promise<Transaction[]> {
    return this.getTransactions()
  }

  async getById(id: string): Promise<Transaction | null> {
    const transactions = this.getTransactions()
    return transactions.find((t) => t.id === id) || null
  }

  /**
   * Validate that date is not in the future
   */
  private validateDate(dateString: string): string {
    if (!dateString) {
      return new Date().toISOString().split('T')[0]
    }
    const date = new Date(dateString)
    const today = new Date()
    today.setHours(23, 59, 59, 999) // End of today
    if (date > today) {
      // Return today's date if future date is provided
      return new Date().toISOString().split('T')[0]
    }
    return dateString
  }

  async create(data: TransactionFormData): Promise<Transaction> {
    const validatedDate = this.validateDate(data.date)
    if (validatedDate !== data.date) {
      console.warn(`Future date detected and corrected: ${data.date} -> ${validatedDate}`)
    }
    const transactions = this.getTransactions()
    const now = new Date().toISOString()
    const transaction: Transaction = {
      id: generateId(),
      type: data.type,
      amount: data.amount,
      description: data.description,
      category: data.category,
      date: validatedDate,
      pocketId: data.pocketId,
      createdAt: now,
      updatedAt: now,
    }
    transactions.push(transaction)
    this.saveTransactions(transactions)
    return transaction
  }

  async createTransfer(fromPocketId: string, toPocketId: string, amount: number): Promise<Transaction> {
    if (amount <= 0) throw new Error('Transfer amount must be greater than 0')
    if (fromPocketId === toPocketId) throw new Error('Source and target pocket must differ')
    const transactions = this.getTransactions()
    const now = new Date().toISOString()
    const today = new Date().toISOString().split('T')[0]
    const tx: Transaction = {
      id: generateId(),
      type: 'transfer',
      amount,
      description: `Transfer to pocket`,
      category: '',
      date: today,
      pocketId: fromPocketId,
      transferToPocketId: toPocketId,
      createdAt: now,
      updatedAt: now,
    }
    transactions.push(tx)
    this.saveTransactions(transactions)
    return tx
  }

  async update(id: string, data: Partial<TransactionFormData>): Promise<Transaction> {
    const transactions = this.getTransactions()
    const index = transactions.findIndex((t) => t.id === id)
    if (index === -1) {
      throw new Error(`Transaksi dengan id ${id} tidak ditemukan`)
    }
    const existing = transactions[index]!

    // Validate and fix date if provided
    const dateToUse = data.date ?? existing.date
    const validatedDate = this.validateDate(dateToUse)
    if (validatedDate !== dateToUse) {
      console.warn(`Future date detected and corrected: ${dateToUse} -> ${validatedDate}`)
    }

    const updated: Transaction = {
      id: existing.id,
      type: (data.type ?? existing.type) as Transaction['type'],
      amount: data.amount ?? existing.amount,
      description: data.description ?? existing.description,
      category: data.category ?? existing.category,
      date: validatedDate,
      pocketId: data.pocketId ?? existing.pocketId,
      transferToPocketId: existing.transferToPocketId,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    }
    transactions[index] = updated
    this.saveTransactions(transactions)
    return updated
  }

  async delete(id: string): Promise<void> {
    const transactions = this.getTransactions()
    const filtered = transactions.filter((t) => t.id !== id)
    this.saveTransactions(filtered)
  }

  async deleteByPocketId(pocketId: string): Promise<void> {
    const transactions = this.getTransactions()
    const filtered = transactions.filter(
      (t) => t.pocketId !== pocketId && t.transferToPocketId !== pocketId,
    )
    this.saveTransactions(filtered)
  }

  async getByFilters(filters: TransactionFilters): Promise<Transaction[]> {
    let transactions = this.getTransactions()

    if (filters.type) {
      transactions = transactions.filter((t) => t.type === filters.type)
    }

    if (filters.category) {
      transactions = transactions.filter((t) => t.category === filters.category)
    }

    if (filters.startDate) {
      transactions = transactions.filter((t) => t.date >= filters.startDate!)
    }

    if (filters.endDate) {
      transactions = transactions.filter((t) => t.date <= filters.endDate!)
    }

    if (filters.pocketId) {
      transactions = transactions.filter((t) => t.pocketId === filters.pocketId || t.transferToPocketId === filters.pocketId)
    }

    return transactions
  }
}

/**
 * Compute balance per pocket from transactions (income - expense, transfer out/in).
 * Transfers do not affect global total; they move money between pockets.
 */
export function computePocketBalances(transactions: Transaction[]): Record<string, number> {
  const bal: Record<string, number> = {}
  for (const t of transactions) {
    if (t.type === 'income') {
      bal[t.pocketId] = (bal[t.pocketId] ?? 0) + t.amount
    } else if (t.type === 'expense') {
      bal[t.pocketId] = (bal[t.pocketId] ?? 0) - t.amount
    } else if (t.type === 'transfer' && t.transferToPocketId) {
      bal[t.pocketId] = (bal[t.pocketId] ?? 0) - t.amount
      bal[t.transferToPocketId] = (bal[t.transferToPocketId] ?? 0) + t.amount
    }
  }
  return bal
}

/**
 * Export singleton instance
 * To switch to API: replace this with ApiTransactionService
 */
export const transactionService: ITransactionService = new LocalStorageTransactionService()

/**
 * Example API Service (commented out - ready to use when needed)
 *
 * class ApiTransactionService implements ITransactionService {
 *   private baseUrl = 'https://api.example.com/transactions'
 *
 *   async getAll(): Promise<Transaction[]> {
 *     const response = await fetch(this.baseUrl)
 *     return response.json()
 *   }
 *
 *   async getById(id: string): Promise<Transaction | null> {
 *     const response = await fetch(`${this.baseUrl}/${id}`)
 *     return response.json()
 *   }
 *
 *   async create(data: TransactionFormData): Promise<Transaction> {
 *     const response = await fetch(this.baseUrl, {
 *       method: 'POST',
 *       headers: { 'Content-Type': 'application/json' },
 *       body: JSON.stringify(data),
 *     })
 *     return response.json()
 *   }
 *
 *   async update(id: string, data: Partial<TransactionFormData>): Promise<Transaction> {
 *     const response = await fetch(`${this.baseUrl}/${id}`, {
 *       method: 'PATCH',
 *       headers: { 'Content-Type': 'application/json' },
 *       body: JSON.stringify(data),
 *     })
 *     return response.json()
 *   }
 *
 *   async delete(id: string): Promise<void> {
 *     await fetch(`${this.baseUrl}/${id}`, { method: 'DELETE' })
 *   }
 *
 *   async getByFilters(filters: TransactionFilters): Promise<Transaction[]> {
 *     const params = new URLSearchParams()
 *     if (filters.type) params.append('type', filters.type)
 *     if (filters.category) params.append('category', filters.category)
 *     if (filters.startDate) params.append('startDate', filters.startDate)
 *     if (filters.endDate) params.append('endDate', filters.endDate)
 *     const response = await fetch(`${this.baseUrl}?${params}`)
 *     return response.json()
 *   }
 * }
 */

