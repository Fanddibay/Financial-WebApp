export type TransactionType = 'income' | 'expense' | 'transfer'

export interface Transaction {
  id: string
  type: TransactionType
  amount: number
  description: string
  category: string
  date: string
  createdAt: string
  updatedAt: string
  pocketId: string
  /** Set only when type === 'transfer': target pocket for internal transfer */
  transferToPocketId?: string
}

export interface TransactionFormData {
  type: TransactionType
  amount: number
  description: string
  category: string
  date: string
  pocketId: string
}

export interface TransactionFilters {
  type?: TransactionType
  category?: string
  startDate?: string
  endDate?: string
  pocketId?: string
}

export interface TransactionSummary {
  totalIncome: number
  totalExpenses: number
  balance: number
  incomeCount: number
  expenseCount: number
}

