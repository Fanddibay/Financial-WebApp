export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface ChatContext {
  /** User's active language ('id' | 'en'). Chatbot responds in this language. */
  locale?: 'id' | 'en'
  /** Goals with current balance and target for goal-related questions */
  goals?: Array<{
    name: string
    icon?: string
    currentBalance: number
    targetAmount: number
    progressPercent: number
    type?: 'saving' | 'investment'
    annualReturnPercentage?: number
  }>
  /** Total assets (pockets + goals) for "total aset" questions */
  totalAssets?: number
  /** Pockets with balance for "kantong/dompet" questions */
  pockets?: Array<{ name: string; balance: number }>
  transactions?: {
    totalIncome: number
    totalExpenses: number
    balance: number
    incomeCount: number
    expenseCount: number
    categoryBreakdown: Array<{
      category: string
      total: number
      count: number
      percentage: number
    }>
    topSpendingCategories: Array<{
      category: string
      total: number
      percentage: number
    }>
    overspendingCategories: Array<{
      category: string
      total: number
      threshold: number
      excess: number
    }>
    averageDailyExpense: number
    savingsRate: number
    monthlyTrends: Array<{
      month: string
      income: number
      expenses: number
      balance: number
    }>
    weeklyTrends: Array<{
      week: string
      income: number
      expenses: number
      balance: number
    }>
  }
}

