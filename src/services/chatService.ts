import type { ChatContext } from '@/types/chat'
import { LocalFinancialAI, type FinancialAnalysis } from './financialAI'

/**
 * Chat Service Interface
 * Modular design to support different AI providers (OpenAI, Anthropic, etc.)
 */
export interface IChatService {
  sendMessage(message: string, context?: ChatContext): Promise<string>
}

/**
 * OpenAI Chat Service
 * Uses OpenAI API to generate responses
 */
class OpenAIChatService implements IChatService {
  private apiKey: string | null = null
  private baseUrl = 'https://api.openai.com/v1'

  constructor() {
    // Get API key from environment or localStorage
    this.apiKey = import.meta.env.VITE_OPENAI_API_KEY || localStorage.getItem('openai_api_key')
  }

  setApiKey(key: string): void {
    this.apiKey = key
    localStorage.setItem('openai_api_key', key)
  }

  async sendMessage(message: string, context?: ChatContext): Promise<string> {
    if (!this.apiKey) {
      throw new Error(
        'API key OpenAI belum dikonfigurasi. Set VITE_OPENAI_API_KEY atau konfigurasi di pengaturan.',
      )
    }

    const systemPrompt = this.buildSystemPrompt(context)
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message },
    ]

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages,
          temperature: 0.7,
          max_tokens: 500,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'Gagal mendapatkan respons dari OpenAI')
      }

      const data = await response.json()
      return data.choices[0]?.message?.content || 'Sorry, I could not generate a response.'
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error('Gagal berkomunikasi dengan layanan AI')
    }
  }

  private buildSystemPrompt(context?: ChatContext): string {
    let prompt = `You are a helpful financial assistant for a personal finance tracking app.
You help users understand their finances, provide budgeting advice, and answer questions about their transactions.

Be concise, friendly, and practical in your responses. Use Indonesian Rupiah (IDR) format when mentioning amounts.`

    if (context?.transactions) {
      const { totalIncome, totalExpenses, balance, incomeCount, expenseCount } =
        context.transactions
      prompt += `\n\nCurrent financial summary:
- Total Income: Rp ${totalIncome.toLocaleString('id-ID')}
- Total Expenses: Rp ${totalExpenses.toLocaleString('id-ID')}
- Balance: Rp ${balance.toLocaleString('id-ID')}
- Income transactions: ${incomeCount}
- Expense transactions: ${expenseCount}

Use Indonesian Rupiah (IDR) format when mentioning amounts.`
    }

    return prompt
  }
}

/**
 * Local AI Chat Service
 * Uses local financial analysis without external API
 * Provides intelligent, Indonesian-focused financial insights
 * Works with summarized data (no raw sensitive data)
 */
class LocalAIChatService implements IChatService {
  async sendMessage(message: string, context?: ChatContext): Promise<string> {
    // If we have transaction data in context, use it for analysis
    if (context?.transactions) {
      // Convert context to FinancialAnalysis format
      const analysis: FinancialAnalysis = {
        totalIncome: context.transactions.totalIncome,
        totalExpenses: context.transactions.totalExpenses,
        balance: context.transactions.balance,
        incomeCount: context.transactions.incomeCount || 0,
        expenseCount: context.transactions.expenseCount || 0,
        categoryBreakdown: context.transactions.categoryBreakdown || [],
        monthlyTrends: context.transactions.monthlyTrends || [],
        weeklyTrends: context.transactions.weeklyTrends || [],
        topSpendingCategories: context.transactions.topSpendingCategories || [],
        averageDailyExpense: context.transactions.averageDailyExpense || 0,
        savingsRate: context.transactions.savingsRate || 0,
        overspendingCategories: context.transactions.overspendingCategories || [],
      }

      const ai = new LocalFinancialAI(analysis)
      return await ai.processMessage(message)
    }

    // Fallback if no context
    return 'Saya membutuhkan data transaksi untuk memberikan analisis. Pastikan Anda sudah menambahkan beberapa transaksi pendapatan dan pengeluaran terlebih dahulu! 📊'
  }
}

/**
 * Export singleton instance
 * Priority: OpenAI (if API key) > LocalAI
 * To use OpenAI: Set VITE_OPENAI_API_KEY in .env or configure in app
 * Default: LocalAIChatService for intelligent local analysis
 */
export const chatService: IChatService = (() => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY || localStorage.getItem('openai_api_key')
  if (apiKey) {
    const service = new OpenAIChatService()
    service.setApiKey(apiKey)
    return service
  }
  // Default to LocalAI for intelligent local analysis
  return new LocalAIChatService()
})()
