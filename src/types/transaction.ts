export type TransactionType = 'income' | 'expense'

export interface Transaction {
  id: string
  type: TransactionType
  amount: number
  description: string
  category: string
  date: string // ISO date string
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
}

export interface TransactionFormData {
  type: TransactionType
  amount: number
  description: string
  category: string
  date: string
}

export interface TransactionFilters {
  type?: TransactionType
  category?: string
  startDate?: string
  endDate?: string
}

export interface TransactionSummary {
  totalIncome: number
  totalExpenses: number
  balance: number
  incomeCount: number
  expenseCount: number
}

