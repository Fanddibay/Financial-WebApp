import type { Transaction, TransactionFormData, TransactionFilters } from '@/types/transaction'

/**
 * Transaction Service Interface
 * This service layer abstracts data operations, making it easy to swap
 * localStorage for a backend API (Supabase, REST, etc.)
 */
export interface ITransactionService {
  getAll(): Promise<Transaction[]>
  getById(id: string): Promise<Transaction | null>
  create(data: TransactionFormData): Promise<Transaction>
  update(id: string, data: Partial<TransactionFormData>): Promise<Transaction>
  delete(id: string): Promise<void>
  getByFilters(filters: TransactionFilters): Promise<Transaction[]>
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
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  private saveTransactions(transactions: Transaction[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions))
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
    // Validate and fix date before creating
    const validatedDate = this.validateDate(data.date)
    if (validatedDate !== data.date) {
      console.warn(`Future date detected and corrected: ${data.date} -> ${validatedDate}`)
    }
    
    const transactions = this.getTransactions()
    const now = new Date().toISOString()
    const transaction: Transaction = {
      id: generateId(),
      ...data,
      date: validatedDate,
      createdAt: now,
      updatedAt: now,
    }
    transactions.push(transaction)
    this.saveTransactions(transactions)
    return transaction
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
      type: data.type ?? existing.type,
      amount: data.amount ?? existing.amount,
      description: data.description ?? existing.description,
      category: data.category ?? existing.category,
      date: validatedDate,
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

    return transactions
  }
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

