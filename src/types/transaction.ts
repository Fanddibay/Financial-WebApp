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
  /** Set when transaction is for a Goal (income only) */
  goalId?: string
  /** Set when type === 'transfer' and target is a Goal */
  transferToGoalId?: string
}

export interface TransactionFormData {
  type: TransactionType
  amount: number
  description: string
  category: string
  date: string
  pocketId: string
  /** Set when transaction is for a Goal (income only) */
  goalId?: string
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

