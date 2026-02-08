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
    const lang = context?.locale === 'en' ? 'English' : 'Indonesian'
    const tone = context?.locale === 'en'
      ? 'Write like a real person: casual, warm, and helpful. Avoid corporate or robotic phrases. Use "you" and contractions (e.g. "you\'re", "here\'s"). Keep it concise and practical.'
      : 'Tulis seperti orang beneran: santai, ramah, dan helpful. Jangan pakai bahasa kaku atau kayak bot. Pakai "kamu" dan bahasa sehari-hari yang tetap sopan. Singkat dan to the point.'
    let prompt = `You are Minfan, a friendly finance buddy for a personal finance app. You help users understand their money, give practical tips, and answer questions about transactions and savings goals.

IMPORTANT: Respond in ${lang} only. Use Indonesian Rupiah (IDR) for amounts when in Indonesian.
${tone}`

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

    if (context?.goals && context.goals.length > 0) {
      prompt += `\n\nUser's savings goals (for goal-related questions):
`
      context.goals.forEach((g) => {
        prompt += `- "${g.name}": current Rp ${g.currentBalance.toLocaleString('id-ID')}, target Rp ${g.targetAmount.toLocaleString('id-ID')}, progress ${g.progressPercent}%\n`
      })
      prompt += `\nWhen asked about goals, list or summarize these goals with balance and progress. Give tips to reach targets if relevant.`
    } else {
      prompt += `\n\nThe user has no savings goals defined yet. If they ask about goals, suggest creating goals in the app (e.g. for down payment, vacation, emergency fund).`
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
    const locale = context?.locale === 'en' ? 'en' : 'id'
    const tx = context?.transactions
    const analysis: FinancialAnalysis = tx
      ? {
          totalIncome: tx.totalIncome,
          totalExpenses: tx.totalExpenses,
          balance: tx.balance,
          incomeCount: tx.incomeCount || 0,
          expenseCount: tx.expenseCount || 0,
          categoryBreakdown: tx.categoryBreakdown || [],
          monthlyTrends: tx.monthlyTrends || [],
          weeklyTrends: tx.weeklyTrends || [],
          topSpendingCategories: tx.topSpendingCategories || [],
          averageDailyExpense: tx.averageDailyExpense || 0,
          savingsRate: tx.savingsRate || 0,
          overspendingCategories: tx.overspendingCategories || [],
          goals: context.goals,
          totalAssets: context.totalAssets,
          pockets: context.pockets,
        }
      : {
          totalIncome: 0,
          totalExpenses: 0,
          balance: 0,
          incomeCount: 0,
          expenseCount: 0,
          categoryBreakdown: [],
          monthlyTrends: [],
          weeklyTrends: [],
          topSpendingCategories: [],
          averageDailyExpense: 0,
          savingsRate: 0,
          overspendingCategories: [],
          goals: context?.goals,
          totalAssets: context?.totalAssets,
          pockets: context?.pockets,
        }

    const ai = new LocalFinancialAI(analysis)
    return await ai.processMessage(message, locale)
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
