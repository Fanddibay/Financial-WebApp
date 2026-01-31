export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface ChatContext {
  /** User's active language ('id' | 'en'). Chatbot responds in this language. */
  locale?: 'id' | 'en'
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

