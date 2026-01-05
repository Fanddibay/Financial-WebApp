import type { Transaction } from '@/types/transaction'
import { formatIDR } from '@/utils/currency'

/**
 * Financial Analysis Data Structure
 * Contains summarized financial insights without raw sensitive data
 */
export interface FinancialAnalysis {
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
  topSpendingCategories: Array<{
    category: string
    total: number
    percentage: number
  }>
  averageDailyExpense: number
  savingsRate: number // percentage of income saved
  overspendingCategories: Array<{
    category: string
    total: number
    threshold: number
    excess: number
  }>
}

/**
 * Analyze transactions and generate financial insights
 */
export function analyzeFinancialData(transactions: Transaction[]): FinancialAnalysis {
  const now = new Date()
  const income = transactions.filter((t) => t.type === 'income')
  const expenses = transactions.filter((t) => t.type === 'expense')

  const totalIncome = income.reduce((sum, t) => sum + t.amount, 0)
  const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0)
  const balance = totalIncome - totalExpenses

  // Category breakdown for expenses
  const categoryMap = new Map<string, { total: number; count: number }>()
  expenses.forEach((t) => {
    const existing = categoryMap.get(t.category) || { total: 0, count: 0 }
    categoryMap.set(t.category, {
      total: existing.total + t.amount,
      count: existing.count + 1,
    })
  })

  const categoryBreakdown = Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      total: data.total,
      count: data.count,
      percentage: totalExpenses > 0 ? (data.total / totalExpenses) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total)

  // Monthly trends (last 6 months)
  const monthlyMap = new Map<string, { income: number; expenses: number }>()
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)

  transactions.forEach((t) => {
    const date = new Date(t.date)
    if (date >= sixMonthsAgo) {
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const existing = monthlyMap.get(monthKey) || { income: 0, expenses: 0 }
      if (t.type === 'income') {
        existing.income += t.amount
      } else {
        existing.expenses += t.amount
      }
      monthlyMap.set(monthKey, existing)
    }
  })

  const monthlyTrends = Array.from(monthlyMap.entries())
    .map(([month, data]) => ({
      month,
      income: data.income,
      expenses: data.expenses,
      balance: data.income - data.expenses,
    }))
    .sort((a, b) => a.month.localeCompare(b.month))

  // Weekly trends (last 4 weeks)
  const weeklyMap = new Map<string, { income: number; expenses: number }>()
  const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000)

  transactions.forEach((t) => {
    const date = new Date(t.date)
    if (date >= fourWeeksAgo) {
      const weekStart = new Date(date)
      weekStart.setDate(date.getDate() - date.getDay())
      const weekKey = `${weekStart.getFullYear()}-W${String(Math.ceil((weekStart.getTime() - new Date(weekStart.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))).padStart(2, '0')}`
      const existing = weeklyMap.get(weekKey) || { income: 0, expenses: 0 }
      if (t.type === 'income') {
        existing.income += t.amount
      } else {
        existing.expenses += t.amount
      }
      weeklyMap.set(weekKey, existing)
    }
  })

  const weeklyTrends = Array.from(weeklyMap.entries())
    .map(([week, data]) => ({
      week,
      income: data.income,
      expenses: data.expenses,
      balance: data.income - data.expenses,
    }))
    .sort((a, b) => a.week.localeCompare(b.week))

  // Top spending categories
  const topSpendingCategories = categoryBreakdown.slice(0, 5)

  // Average daily expense
  const daysWithExpenses = new Set(expenses.map((t) => t.date.split('T')[0])).size
  const averageDailyExpense = daysWithExpenses > 0 ? totalExpenses / daysWithExpenses : 0

  // Savings rate
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0

  // Detect overspending (categories exceeding 30% of total expenses are flagged)
  const overspendingThreshold = totalExpenses * 0.3
  const overspendingCategories = categoryBreakdown
    .filter((cat) => cat.total > overspendingThreshold)
    .map((cat) => ({
      category: cat.category,
      total: cat.total,
      threshold: overspendingThreshold,
      excess: cat.total - overspendingThreshold,
    }))

  return {
    totalIncome,
    totalExpenses,
    balance,
    incomeCount: income.length,
    expenseCount: expenses.length,
    categoryBreakdown,
    monthlyTrends,
    weeklyTrends,
    topSpendingCategories,
    averageDailyExpense,
    savingsRate,
    overspendingCategories,
  }
}

/**
 * Local AI Financial Chatbot
 * Provides intelligent financial insights without external API
 */
export class LocalFinancialAI {
  private analysis: FinancialAnalysis

  constructor(transactionsOrAnalysis: Transaction[] | FinancialAnalysis) {
    if (Array.isArray(transactionsOrAnalysis)) {
      this.analysis = analyzeFinancialData(transactionsOrAnalysis)
    } else {
      this.analysis = transactionsOrAnalysis
    }
  }

  /**
   * Process user message and generate intelligent response
   */
  async processMessage(message: string): Promise<string> {
    // Simulate thinking delay for better UX
    await new Promise((resolve) => setTimeout(resolve, 800))

    const lowerMessage = message.toLowerCase().trim()

    // Greetings
    if (this.matches(lowerMessage, ['halo', 'hello', 'hi', 'hai', 'selamat'])) {
      return this.getGreeting()
    }

    // Spending health
    if (this.matches(lowerMessage, ['sehat', 'healthy', 'baik', 'bagus', 'spending healthy'])) {
      return this.analyzeSpendingHealth()
    }

    // Balance questions
    if (this.matches(lowerMessage, ['saldo', 'balance', 'sisa', 'sisa uang', 'berapa sisa'])) {
      return this.getBalanceInsight()
    }

    // Income vs expense
    if (this.matches(lowerMessage, ['pendapatan', 'income', 'pengeluaran', 'expense', 'pendapatan vs', 'income vs'])) {
      return this.compareIncomeExpense()
    }

    // Savings potential
    if (this.matches(lowerMessage, ['tabungan', 'saving', 'hemat', 'save', 'potensi tabung', 'bisa hemat'])) {
      return this.analyzeSavingsPotential()
    }

    // Category analysis
    if (this.matches(lowerMessage, ['kategori', 'category', 'pengeluaran terbanyak', 'spending terbanyak', 'top spending'])) {
      return this.analyzeTopCategories()
    }

    // Overspending detection
    if (this.matches(lowerMessage, ['boros', 'overspending', 'terlalu banyak', 'kebanyakan', 'berlebihan', 'dimana boros'])) {
      return this.detectOverspending()
    }

    // Monthly summary
    if (this.matches(lowerMessage, ['bulanan', 'monthly', 'bulan ini', 'this month', 'ringkasan bulan'])) {
      return this.getMonthlySummary()
    }

    // Weekly summary
    if (this.matches(lowerMessage, ['mingguan', 'weekly', 'minggu ini', 'this week', 'ringkasan minggu'])) {
      return this.getWeeklySummary()
    }

    // Where to save
    if (this.matches(lowerMessage, ['dimana hemat', 'where save', 'dimana bisa hemat', 'where can save', 'tips hemat'])) {
      return this.suggestSavings()
    }

    // General advice
    if (this.matches(lowerMessage, ['saran', 'advice', 'tips', 'rekomendasi', 'suggestion'])) {
      return this.getGeneralAdvice()
    }

    // Trend analysis
    if (this.matches(lowerMessage, ['trend', 'tren', 'perkembangan', 'perubahan', 'naik turun'])) {
      return this.analyzeTrends()
    }

    // Default response with helpful suggestions
    return this.getDefaultResponse()
  }

  private matches(message: string, keywords: string[]): boolean {
    return keywords.some((keyword) => message.includes(keyword))
  }

  private getGreeting(): string {
    const { balance, savingsRate } = this.analysis
    let greeting = 'Halo! 👋 Saya asisten keuangan Anda. '

    if (balance > 0) {
      greeting += `Saya lihat keuangan Anda dalam kondisi baik dengan saldo positif ${formatIDR(balance)}. `
    } else if (balance < 0) {
      greeting += `Saya perhatikan pengeluaran Anda melebihi pendapatan. Mari kita analisis lebih lanjut. `
    } else {
      greeting += `Mari kita mulai melacak keuangan Anda dengan lebih baik. `
    }

    greeting += 'Saya bisa membantu Anda dengan:\n'
    greeting += '• Analisis pengeluaran dan kesehatan finansial\n'
    greeting += '• Ringkasan bulanan/mingguan\n'
    greeting += '• Deteksi pengeluaran berlebihan\n'
    greeting += '• Saran penghematan dan tips keuangan\n'
    greeting += '• Perbandingan pendapatan vs pengeluaran\n\n'
    greeting += 'Apa yang ingin Anda ketahui hari ini?'

    return greeting
  }

  private analyzeSpendingHealth(): string {
    const { balance, savingsRate, totalIncome, totalExpenses } = this.analysis

    if (totalIncome === 0) {
      return 'Saya belum melihat data pendapatan Anda. Mulai tambahkan transaksi pendapatan untuk mendapatkan analisis yang lebih akurat! 💰'
    }

    let response = '📊 **Analisis Kesehatan Keuangan Anda:**\n\n'

    // Balance analysis
    if (balance > 0) {
      const percentage = (balance / totalIncome) * 100
      if (percentage >= 20) {
        response += `✅ **Sangat Baik!** Anda memiliki saldo positif ${formatIDR(balance)} (${percentage.toFixed(1)}% dari pendapatan). Ini menunjukkan pengelolaan keuangan yang baik.\n\n`
      } else if (percentage >= 10) {
        response += `✅ **Baik** - Saldo positif ${formatIDR(balance)} (${percentage.toFixed(1)}% dari pendapatan). Tetap pertahankan! 💪\n\n`
      } else {
        response += `⚠️ **Hati-hati** - Saldo positif ${formatIDR(balance)}, tapi hanya ${percentage.toFixed(1)}% dari pendapatan. Pertimbangkan untuk meningkatkan tabungan.\n\n`
      }
    } else if (balance < 0) {
      response += `❌ **Perhatian!** Pengeluaran Anda melebihi pendapatan sebesar ${formatIDR(Math.abs(balance))}. Ini bisa berbahaya untuk jangka panjang.\n\n`
    } else {
      response += `⚖️ **Seimbang** - Pendapatan dan pengeluaran Anda seimbang. Pertimbangkan untuk mulai menabung.\n\n`
    }

    // Savings rate
    if (savingsRate > 0) {
      response += `💰 **Tingkat Tabungan:** ${savingsRate.toFixed(1)}% dari pendapatan\n`
      if (savingsRate >= 20) {
        response += 'Ini sangat baik! Target ideal adalah 20-30%.\n\n'
      } else if (savingsRate >= 10) {
        response += 'Bagus! Coba tingkatkan menjadi 20% untuk masa depan yang lebih aman.\n\n'
      } else {
        response += 'Coba tingkatkan tabungan Anda sedikit demi sedikit.\n\n'
      }
    }

    // Spending ratio
    const expenseRatio = (totalExpenses / totalIncome) * 100
    response += `📈 **Rasio Pengeluaran:** ${expenseRatio.toFixed(1)}% dari pendapatan\n`

    if (expenseRatio <= 70) {
      response += 'Pengeluaran Anda terkontrol dengan baik! ✅'
    } else if (expenseRatio <= 90) {
      response += 'Pengeluaran cukup tinggi, pertimbangkan untuk mengurangi beberapa kategori. ⚠️'
    } else {
      response += 'Pengeluaran sangat tinggi! Perlu evaluasi segera. ❌'
    }

    return response
  }

  private getBalanceInsight(): string {
    const { balance, totalIncome, totalExpenses } = this.analysis

    let response = '💰 **Saldo Keuangan Anda:**\n\n'
    response += `Saldo saat ini: **${formatIDR(balance)}**\n\n`

    if (balance > 0) {
      response += `✅ Saldo positif! Anda memiliki sisa ${formatIDR(balance)} setelah semua pengeluaran.\n\n`
      response += `Dari total pendapatan ${formatIDR(totalIncome)}, Anda telah mengeluarkan ${formatIDR(totalExpenses)}.\n\n`
      
      const daysLeft = Math.ceil(balance / this.analysis.averageDailyExpense)
      if (this.analysis.averageDailyExpense > 0 && daysLeft > 0) {
        response += `💡 Dengan rata-rata pengeluaran harian ${formatIDR(this.analysis.averageDailyExpense)}, saldo ini bisa bertahan sekitar ${daysLeft} hari.`
      }
    } else if (balance < 0) {
      response += `⚠️ Saldo negatif! Pengeluaran melebihi pendapatan sebesar ${formatIDR(Math.abs(balance))}.\n\n`
      response += `Ini berarti Anda perlu:\n`
      response += `• Mengurangi pengeluaran sebesar ${formatIDR(Math.abs(balance))}\n`
      response += `• Atau menambah pendapatan\n\n`
      response += `Mari kita lihat kategori mana yang bisa dikurangi.`
    } else {
      response += `⚖️ Saldo nol - Pendapatan dan pengeluaran seimbang.\n\n`
      response += `Pertimbangkan untuk mulai menabung sedikit demi sedikit untuk masa depan.`
    }

    return response
  }

  private compareIncomeExpense(): string {
    const { totalIncome, totalExpenses, balance } = this.analysis

    if (totalIncome === 0) {
      return 'Saya belum melihat data pendapatan Anda. Tambahkan transaksi pendapatan untuk analisis yang lebih baik! 💰'
    }

    let response = '📊 **Perbandingan Pendapatan vs Pengeluaran:**\n\n'
    response += `💰 Total Pendapatan: ${formatIDR(totalIncome)}\n`
    response += `💸 Total Pengeluaran: ${formatIDR(totalExpenses)}\n`
    response += `⚖️ Saldo: ${formatIDR(balance)}\n\n`

    const ratio = (totalExpenses / totalIncome) * 100
    response += `**Rasio:** Pengeluaran adalah ${ratio.toFixed(1)}% dari pendapatan\n\n`

    if (ratio <= 70) {
      response += '✅ **Sangat baik!** Anda mengelola keuangan dengan baik. Pengeluaran terkontrol dan masih ada ruang untuk tabungan.\n\n'
      response += `💡 Dengan rasio ini, Anda bisa menabung sekitar ${formatIDR(balance)} atau lebih.`
    } else if (ratio <= 90) {
      response += '⚠️ **Hati-hati** - Pengeluaran cukup tinggi. Coba kurangi beberapa pengeluaran tidak penting.\n\n'
      response += `💡 Target: Kurangi pengeluaran menjadi 70% dari pendapatan untuk kesehatan finansial yang lebih baik.`
    } else {
      response += '❌ **Perhatian!** Pengeluaran sangat tinggi dibanding pendapatan. Ini tidak berkelanjutan.\n\n'
      response += `💡 **Tindakan segera:**\n`
      response += `• Identifikasi pengeluaran yang bisa dikurangi\n`
      response += `• Prioritaskan kebutuhan vs keinginan\n`
      response += `• Target: Kurangi pengeluaran minimal ${formatIDR(Math.abs(balance))}`
    }

    return response
  }

  private analyzeSavingsPotential(): string {
    const { balance, savingsRate, totalIncome, overspendingCategories } = this.analysis

    if (totalIncome === 0) {
      return 'Tambahkan data pendapatan untuk melihat potensi tabungan Anda! 💰'
    }

    let response = '💾 **Analisis Potensi Tabungan:**\n\n'

    if (balance > 0) {
      response += `✅ Saat ini Anda sudah menabung ${formatIDR(balance)} (${savingsRate.toFixed(1)}% dari pendapatan)\n\n`
    } else {
      response += `⚠️ Saat ini pengeluaran melebihi pendapatan sebesar ${formatIDR(Math.abs(balance))}\n\n`
    }

    // Calculate potential savings from overspending
    if (overspendingCategories.length > 0) {
      const totalOverspending = overspendingCategories.reduce((sum, cat) => sum + cat.excess, 0)
      response += `💡 **Potensi Penghematan:**\n\n`
      response += `Dari kategori yang berlebihan, Anda bisa menghemat sekitar ${formatIDR(totalOverspending)}:\n\n`
      
      overspendingCategories.forEach((cat) => {
        response += `• ${cat.category}: ${formatIDR(cat.excess)} (dari total ${formatIDR(cat.total)})\n`
      })
      
      response += `\nJika berhasil menghemat, saldo baru Anda bisa menjadi ${formatIDR(balance + totalOverspending)}! 🎯`
    } else {
      response += `💡 **Tips Meningkatkan Tabungan:**\n\n`
      response += `• Target tabungan ideal: 20-30% dari pendapatan\n`
      response += `• Saat ini: ${savingsRate.toFixed(1)}%\n`
      
      if (savingsRate < 20) {
        const target = totalIncome * 0.2
        const needed = target - balance
        response += `• Untuk mencapai 20%, coba hemat ${formatIDR(needed)} per bulan\n`
      }
      
      response += `\n💪 Mulai dari hal kecil: kurangi pengeluaran tidak penting, bandingkan harga sebelum beli, dan buat anggaran harian.`
    }

    return response
  }

  private analyzeTopCategories(): string {
    const { topSpendingCategories, totalExpenses } = this.analysis

    if (topSpendingCategories.length === 0) {
      return 'Belum ada data pengeluaran untuk dianalisis. Tambahkan transaksi pengeluaran terlebih dahulu! 📝'
    }

    let response = '📊 **Kategori Pengeluaran Terbanyak:**\n\n'

    topSpendingCategories.forEach((cat, index) => {
      const emoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '•'
      response += `${emoji} **${cat.category}**: ${formatIDR(cat.total)} (${cat.percentage.toFixed(1)}%)\n`
    })

    response += `\n💡 **Insight:**\n`
    const topCategory = topSpendingCategories[0]
    if (topCategory) {
      response += `Kategori "${topCategory.category}" adalah pengeluaran terbesar Anda (${topCategory.percentage.toFixed(1)}% dari total). `
      
      if (topCategory.percentage > 40) {
        response += `Ini cukup tinggi - pertimbangkan untuk mengevaluasi apakah semua pengeluaran di kategori ini benar-benar perlu.`
      } else {
        response += `Ini wajar, tapi tetap pantau agar tidak berlebihan.`
      }
    }

    return response
  }

  private detectOverspending(): string {
    const { overspendingCategories, categoryBreakdown } = this.analysis

    if (overspendingCategories.length === 0) {
      return '✅ Bagus! Saya tidak mendeteksi pengeluaran berlebihan di kategori manapun. Pengeluaran Anda terdistribusi dengan baik! 💪'
    }

    let response = '⚠️ **Deteksi Pengeluaran Berlebihan:**\n\n'
    response += `Saya menemukan ${overspendingCategories.length} kategori yang melebihi 30% dari total pengeluaran:\n\n`

    overspendingCategories.forEach((cat) => {
      const percentage = (cat.total / this.analysis.totalExpenses) * 100
      response += `🔴 **${cat.category}**:\n`
      response += `   • Total: ${formatIDR(cat.total)} (${percentage.toFixed(1)}%)\n`
      response += `   • Berlebihan: ${formatIDR(cat.excess)}\n\n`
    })

    response += `💡 **Rekomendasi:**\n`
    response += `• Evaluasi setiap transaksi di kategori tersebut\n`
    response += `• Identifikasi pengeluaran yang bisa dikurangi atau ditunda\n`
    response += `• Buat anggaran khusus untuk kategori tersebut\n`
    response += `• Target: Kurangi ${overspendingCategories.length > 1 ? 'masing-masing kategori' : 'kategori ini'} menjadi maksimal 25% dari total pengeluaran`

    return response
  }

  private getMonthlySummary(): string {
    const { monthlyTrends, totalIncome, totalExpenses, balance } = this.analysis

    if (monthlyTrends.length === 0) {
      return 'Belum ada cukup data untuk ringkasan bulanan. Tambahkan lebih banyak transaksi! 📅'
    }

    let response = '📅 **Ringkasan Bulanan (6 Bulan Terakhir):**\n\n'

    monthlyTrends.slice(-3).forEach((trend) => {
      const monthName = this.formatMonth(trend.month)
      const trendEmoji = trend.balance > 0 ? '✅' : trend.balance < 0 ? '❌' : '⚖️'
      response += `${trendEmoji} **${monthName}**:\n`
      response += `   • Pendapatan: ${formatIDR(trend.income)}\n`
      response += `   • Pengeluaran: ${formatIDR(trend.expenses)}\n`
      response += `   • Saldo: ${formatIDR(trend.balance)}\n\n`
    })

    // Current month summary
    const currentMonth = monthlyTrends[monthlyTrends.length - 1]
    if (currentMonth) {
      response += `📊 **Bulan Ini:**\n`
      response += `Pendapatan: ${formatIDR(currentMonth.income)}\n`
      response += `Pengeluaran: ${formatIDR(currentMonth.expenses)}\n`
      response += `Saldo: ${formatIDR(currentMonth.balance)}\n\n`

      if (currentMonth.balance > 0) {
        response += `✅ Bulan ini berjalan baik dengan saldo positif!`
      } else {
        response += `⚠️ Perhatian: Pengeluaran bulan ini melebihi pendapatan.`
      }
    }

    return response
  }

  private getWeeklySummary(): string {
    const { weeklyTrends } = this.analysis

    if (weeklyTrends.length === 0) {
      return 'Belum ada cukup data untuk ringkasan mingguan. Tambahkan lebih banyak transaksi! 📅'
    }

    let response = '📅 **Ringkasan Mingguan (4 Minggu Terakhir):**\n\n'

    weeklyTrends.slice(-4).forEach((trend, index) => {
      const weekLabel = index === weeklyTrends.length - 1 ? 'Minggu Ini' : `Minggu ${index + 1}`
      const trendEmoji = trend.balance > 0 ? '✅' : trend.balance < 0 ? '❌' : '⚖️'
      response += `${trendEmoji} **${weekLabel}**:\n`
      response += `   • Pendapatan: ${formatIDR(trend.income)}\n`
      response += `   • Pengeluaran: ${formatIDR(trend.expenses)}\n`
      response += `   • Saldo: ${formatIDR(trend.balance)}\n\n`
    })

    const thisWeek = weeklyTrends[weeklyTrends.length - 1]
    if (thisWeek) {
      response += `💡 **Insight Minggu Ini:**\n`
      if (thisWeek.balance > 0) {
        response += `Minggu ini berjalan baik! Tetap pertahankan pengeluaran yang terkontrol.`
      } else {
        response += `Pengeluaran minggu ini cukup tinggi. Coba kurangi pengeluaran tidak penting untuk sisa minggu ini.`
      }
    }

    return response
  }

  private suggestSavings(): string {
    const { topSpendingCategories, overspendingCategories, averageDailyExpense } = this.analysis

    let response = '💡 **Saran Penghematan:**\n\n'

    if (overspendingCategories.length > 0) {
      response += `🎯 **Prioritas Utama:**\n\n`
      overspendingCategories.forEach((cat) => {
        response += `• **${cat.category}**: Hemat ${formatIDR(cat.excess)} dengan:\n`
        response += `  - Evaluasi setiap pembelian\n`
        response += `  - Cari alternatif yang lebih murah\n`
        response += `  - Tunda pembelian tidak urgent\n\n`
      })
    }

    if (topSpendingCategories.length > 0) {
      response += `📋 **Kategori dengan Potensi Hemat:**\n\n`
      topSpendingCategories.slice(0, 3).forEach((cat) => {
        const potential = cat.total * 0.1 // 10% reduction
        response += `• **${cat.category}**: Coba hemat 10% = ${formatIDR(potential)}\n`
      })
    }

    response += `\n💰 **Tips Umum:**\n`
    response += `• Buat anggaran harian: ${formatIDR(averageDailyExpense * 1.1)} (10% buffer)\n`
    response += `• Bandingkan harga sebelum beli\n`
    response += `• Gunakan cashback atau diskon jika tersedia\n`
    response += `• Prioritaskan kebutuhan vs keinginan\n`
    response += `• Review pengeluaran mingguan untuk kontrol yang lebih baik`

    return response
  }

  private getGeneralAdvice(): string {
    const { balance, savingsRate, totalIncome } = this.analysis

    let response = '💡 **Saran Keuangan Umum:**\n\n'

    if (balance > 0 && savingsRate >= 20) {
      response += `✅ Keuangan Anda sudah dalam kondisi baik! Tetap pertahankan kebiasaan baik ini.\n\n`
      response += `💪 **Langkah selanjutnya:**\n`
      response += `• Pertimbangkan investasi untuk pertumbuhan jangka panjang\n`
      response += `• Buat dana darurat (3-6 bulan pengeluaran)\n`
      response += `• Set goals finansial jangka pendek dan panjang`
    } else if (balance > 0) {
      response += `✅ Saldo positif adalah awal yang baik!\n\n`
      response += `💪 **Tips meningkatkan tabungan:**\n`
      response += `• Target tabungan 20% dari pendapatan\n`
      response += `• Otomatiskan tabungan di awal bulan\n`
      response += `• Kurangi pengeluaran tidak penting\n`
      response += `• Review dan kurangi langganan yang tidak digunakan`
    } else {
      response += `⚠️ Pengeluaran melebihi pendapatan perlu segera ditangani.\n\n`
      response += `💪 **Tindakan segera:**\n`
      response += `• Identifikasi dan kurangi pengeluaran tidak penting\n`
      response += `• Buat anggaran ketat dan patuhi\n`
      response += `• Cari cara tambah pendapatan (side income)\n`
      response += `• Prioritaskan pembayaran utang jika ada\n`
      response += `• Konsultasi dengan financial advisor jika perlu`
    }

    response += `\n\n📌 **Ingat:** Saran ini bersifat umum dan bukan nasihat keuangan profesional. Sesuaikan dengan kondisi pribadi Anda.`

    return response
  }

  private analyzeTrends(): string {
    const { monthlyTrends, weeklyTrends } = this.analysis

    if (monthlyTrends.length < 2) {
      return 'Perlu lebih banyak data untuk analisis tren. Tambahkan transaksi selama beberapa bulan! 📈'
    }

    let response = '📈 **Analisis Tren Keuangan:**\n\n'

    // Monthly trend
    if (monthlyTrends.length >= 2) {
      const recent = monthlyTrends.slice(-3)
      const avgExpense = recent.reduce((sum, t) => sum + t.expenses, 0) / recent.length
      const latestExpense = recent[recent.length - 1]?.expenses || 0
      
      response += `📅 **Tren Bulanan:**\n`
      if (latestExpense > avgExpense * 1.1) {
        response += `⚠️ Pengeluaran bulan ini ${((latestExpense / avgExpense - 1) * 100).toFixed(1)}% lebih tinggi dari rata-rata.\n\n`
      } else if (latestExpense < avgExpense * 0.9) {
        response += `✅ Pengeluaran bulan ini ${((1 - latestExpense / avgExpense) * 100).toFixed(1)}% lebih rendah dari rata-rata. Bagus! 💪\n\n`
      } else {
        response += `⚖️ Pengeluaran bulan ini stabil, mendekati rata-rata.\n\n`
      }
    }

    // Weekly trend
    if (weeklyTrends.length >= 2) {
      const recent = weeklyTrends.slice(-2)
      const thisWeek = recent[recent.length - 1]?.expenses || 0
      const lastWeek = recent[0]?.expenses || 0
      
      response += `📅 **Tren Mingguan:**\n`
      if (thisWeek > lastWeek * 1.15) {
        response += `⚠️ Pengeluaran minggu ini ${((thisWeek / lastWeek - 1) * 100).toFixed(1)}% lebih tinggi dari minggu lalu.\n\n`
      } else if (thisWeek < lastWeek * 0.85) {
        response += `✅ Pengeluaran minggu ini ${((1 - thisWeek / lastWeek) * 100).toFixed(1)}% lebih rendah dari minggu lalu. Pertahankan! 💪\n\n`
      } else {
        response += `⚖️ Pengeluaran minggu ini stabil dibanding minggu lalu.\n\n`
      }
    }

    response += `💡 **Kesimpulan:**\n`
    response += `Pantau tren ini secara berkala untuk mengidentifikasi pola pengeluaran dan peluang penghematan.`

    return response
  }

  private getDefaultResponse(): string {
    return `Saya memahami pertanyaan Anda. Sebagai asisten keuangan, saya bisa membantu dengan:\n\n` +
      `📊 **Analisis & Insight:**\n` +
      `• "Apakah pengeluaran saya sehat?" - Analisis kesehatan finansial\n` +
      `• "Berapa saldo saya?" - Cek saldo dan insight\n` +
      `• "Dimana saya bisa hemat?" - Saran penghematan\n` +
      `• "Kategori pengeluaran terbanyak?" - Analisis kategori\n\n` +
      `📅 **Ringkasan:**\n` +
      `• "Ringkasan bulanan" - Ringkasan 6 bulan terakhir\n` +
      `• "Ringkasan mingguan" - Ringkasan 4 minggu terakhir\n\n` +
      `💡 **Saran:**\n` +
      `• "Saran keuangan" - Tips dan rekomendasi umum\n` +
      `• "Potensi tabungan" - Analisis potensi menabung\n` +
      `• "Deteksi boros" - Identifikasi pengeluaran berlebihan\n\n` +
      `Coba tanyakan salah satu di atas, atau tanyakan hal spesifik tentang keuangan Anda! 😊`
  }

  private formatMonth(monthKey: string): string {
    const [year, month] = monthKey.split('-')
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ]
    return `${monthNames[parseInt(month) - 1]} ${year}`
  }
}

