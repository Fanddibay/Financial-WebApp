import type { TransactionFormData } from '@/types/transaction'

/**
 * Parse result with confidence indicators
 */
export interface TextParseResult {
  success: boolean
  data: Partial<TransactionFormData>
  confidence: {
    amount: 'high' | 'medium' | 'low' | 'none'
    type: 'high' | 'medium' | 'low' | 'none'
    category: 'high' | 'medium' | 'low' | 'none'
    date: 'high' | 'medium' | 'low' | 'none'
  }
  errors?: string[]
  warnings?: string[]
}

/**
 * Get today's date string in YYYY-MM-DD format
 */
function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0]
}

/**
 * Get yesterday's date string in YYYY-MM-DD format
 */
function getYesterdayDateString(): string {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return yesterday.toISOString().split('T')[0]
}

/**
 * Get multiplier value from multiplier word
 */
function getMultiplierValue(multiplier: string): number {
  const mult = multiplier.toLowerCase()
  if (mult === 'ribu' || mult === 'rb' || mult === 'k') {
    return 1000
  } else if (mult === 'juta' || mult === 'jt' || mult === 'm') {
    return 1000000
  } else if (mult === 'milyar' || mult === 'miliar' || mult === 'b') {
    return 1000000000
  }
  return 1
}

/**
 * Parse amount from text
 * Handles: "20 ribu", "20k", "Rp 20.000", "5 juta", "500rb", "Rp 5.000.000", 
 *          "1 juta 520 ribu", "1juta 520rb", "2 juta 300 ribu 50 ribu", etc.
 * Priority: Multiple multipliers > Single multiplier > Currency format > Plain numbers
 */
function parseAmount(text: string): { amount: number; confidence: 'high' | 'medium' | 'low' | 'none' } {
  const lowerText = text.toLowerCase().trim()
  
  // Pattern 1: Multiple multipliers (HIGHEST PRIORITY)
  // Matches: "1 juta 520 ribu", "1juta 520rb", "2 juta 300 ribu 50 ribu", "1.5 juta", 
  //          "1juta520rb" (no spaces), "1 juta 500 ribu", etc.
  // This pattern finds all number-multiplier pairs and sums them
  // We use a flexible pattern that handles both with and without spaces
  
  // Unified pattern that matches number-multiplier pairs with optional space
  // This pattern will match: "1 juta", "1juta", "520 ribu", "520rb", "1juta520rb", etc.
  // Pattern explanation:
  // - (\d+(?:[.,]\d+)?) - matches number with optional decimal
  // - \s* - optional whitespace
  // - (ribu|rb|k|juta|jt|m|milyar|miliar|b) - multiplier word
  // - (?=\s|$|[^\w\d]|\d) - lookahead: space, end, non-word/digit, or another digit (for next number)
  const multiplierPattern = /(\d+(?:[.,]\d+)?)\s*(ribu|rb|k|juta|jt|m|milyar|miliar|b)(?=\s|$|[^\w\d]|\d)/gi
  const allMultiplierMatches = Array.from(lowerText.matchAll(multiplierPattern))
  
  if (allMultiplierMatches.length > 0) {
    let totalAmount = 0
    let hasValidAmount = false
    
    // Sort matches by position in text (left to right) to process in order
    const sortedMatches = [...allMultiplierMatches].sort((a, b) => {
      const aIndex = a.index ?? 0
      const bIndex = b.index ?? 0
      return aIndex - bIndex
    })
    
    // Process all multiplier matches and sum them
    for (const match of sortedMatches) {
      const numberStr = match[1].replace(/,/g, '.') // Handle comma as decimal separator
      const number = parseFloat(numberStr)
      const multiplier = match[2]
      
      if (!isNaN(number) && number > 0) {
        const multiplierValue = getMultiplierValue(multiplier)
        const partialAmount = Math.round(number * multiplierValue)
        
        if (partialAmount > 0 && partialAmount <= 10000000000) {
          totalAmount += partialAmount
          hasValidAmount = true
        }
      }
    }
    
    // If we found multiple multipliers, return the sum (highest confidence)
    if (hasValidAmount && sortedMatches.length > 1) {
      if (totalAmount > 0 && totalAmount <= 10000000000) {
        return { amount: totalAmount, confidence: 'high' }
      }
    }
    
    // If only one multiplier found, use it
    if (hasValidAmount && allMultiplierMatches.length === 1) {
      if (totalAmount > 0 && totalAmount <= 10000000000) {
        // Check if there's a currency format that might be more accurate
        // Only prefer currency format if it's significantly different (more than 10%)
        const currencyPattern = /(?:rp\s*)?(\d{1,3}(?:[.,]\d{3})+(?:\.\d{2})?)/gi
        const currencyMatches = Array.from(lowerText.matchAll(currencyPattern))
        
        if (currencyMatches.length > 0) {
          // Check if currency format gives a different (and likely more accurate) result
          let largestCurrency = 0
          for (const currMatch of currencyMatches) {
            const currStr = currMatch[1]
            let normalized = currStr
            if (currStr.includes('.') && currStr.split('.').length > 2) {
              normalized = currStr.replace(/\./g, '')
            } else {
              normalized = currStr.replace(/[.,]/g, '')
            }
            const currAmount = parseFloat(normalized)
            if (!isNaN(currAmount) && currAmount > largestCurrency) {
              largestCurrency = currAmount
            }
          }
          
          // If currency format is close to multiplier result, prefer currency (more explicit)
          // Otherwise, use multiplier result
          if (largestCurrency > 0 && Math.abs(largestCurrency - totalAmount) / totalAmount < 0.1) {
            // Currency format is close, continue to currency pattern check
          } else {
            // Multiplier is more accurate, return it
            return { amount: totalAmount, confidence: 'high' }
          }
        } else {
          // No currency format found, return multiplier result
          return { amount: totalAmount, confidence: 'high' }
        }
      }
    }
  }
  
  // Pattern 1b: Single multiplier (fallback if multiple not found)
  // Matches: "20 ribu", "5 juta", "500rb", "15k", "2.5 juta", etc.
  const singleMultiplierPattern = /(\d+(?:[.,]\d+)?)\s*(ribu|rb|k|juta|jt|m|milyar|miliar|b)\b/i
  const singleMultiplierMatch = lowerText.match(singleMultiplierPattern)
  if (singleMultiplierMatch && allMultiplierMatches.length === 0) {
    const numberStr = singleMultiplierMatch[1].replace(/,/g, '.')
    const number = parseFloat(numberStr)
    const multiplier = singleMultiplierMatch[2].toLowerCase()
    
    if (!isNaN(number) && number > 0) {
      const multiplierValue = getMultiplierValue(multiplier)
      const amount = Math.round(number * multiplierValue)
      
      if (!isNaN(amount) && amount > 0 && amount <= 10000000000) {
        return { amount, confidence: 'high' }
      }
    }
  }

  // Pattern 2: Explicit currency format with dots/commas (Rp 20.000, Rp 5.000.000, 20.000)
  // This handles Indonesian number format where dots are thousand separators
  const currencyPattern = /(?:rp\s*)?(\d{1,3}(?:[.,]\d{3})*(?:\.\d{2})?)/gi
  const currencyMatches = Array.from(lowerText.matchAll(currencyPattern))
  
  // Find the largest amount (likely the total)
  let largestAmount = 0
  for (const match of currencyMatches) {
    if (match.index !== undefined) {
      const amountStr = match[1]
      // Check if dots are thousand separators (Indonesian format) or decimal point
      // If it's like "20.000" or "5.000.000", treat dots as thousand separators
      let normalizedStr = amountStr
      
      // If it ends with .XX (2 digits), it's a decimal point
      if (/\.\d{2}$/.test(amountStr)) {
        // Has decimal, so dots before are thousand separators
        normalizedStr = amountStr.replace(/\./g, '').replace(',', '.')
      } else if (amountStr.includes('.') && amountStr.split('.').length > 2) {
        // Multiple dots = thousand separators (Indonesian format)
        normalizedStr = amountStr.replace(/\./g, '')
      } else if (amountStr.includes(',')) {
        // Comma might be decimal or thousand separator
        if (amountStr.split(',')[1]?.length === 2) {
          // Two digits after comma = decimal
          normalizedStr = amountStr.replace(/,/g, '.')
        } else {
          // Otherwise treat as thousand separator
          normalizedStr = amountStr.replace(/,/g, '')
        }
      } else {
        // No separators, use as is
        normalizedStr = amountStr
      }
      
      const amount = parseFloat(normalizedStr.replace(/[^\d.]/g, ''))
      if (!isNaN(amount) && amount > 0 && amount > largestAmount) {
        largestAmount = amount
      }
    }
  }
  
  if (largestAmount > 0 && largestAmount >= 1000 && largestAmount <= 10000000000) {
    return { amount: Math.round(largestAmount), confidence: 'high' }
  }

  // Pattern 3: Plain numbers with 4+ digits (likely already in rupiah)
  const largeNumberPattern = /\b(\d{4,})\b/
  const largeNumberMatch = lowerText.match(largeNumberPattern)
  if (largeNumberMatch) {
    const amount = parseInt(largeNumberMatch[1].replace(/[.,]/g, ''), 10)
    if (!isNaN(amount) && amount >= 1000 && amount <= 10000000000) {
      return { amount, confidence: 'medium' }
    }
  }

  // Pattern 4: Small numbers (1-3 digits) - only if context suggests amount
  // This is low confidence and should be avoided if possible
  const smallNumberPattern = /\b(\d{1,3})\b/
  const smallMatch = lowerText.match(smallNumberPattern)
  if (smallMatch) {
    const num = parseInt(smallMatch[1], 10)
    // Only assume thousands if there's clear transaction context
    const hasTransactionContext = /(beli|bayar|gaji|transfer|tagihan|pembayaran|pengeluaran|pendapatan)/i.test(lowerText)
    if (num >= 1 && num <= 999 && hasTransactionContext && !multiplierMatch) {
      // Only use this if no multiplier was found
      return { amount: num * 1000, confidence: 'low' }
    }
  }

  return { amount: 0, confidence: 'none' }
}

/**
 * Detect transaction type (expense or income)
 */
function detectTransactionType(text: string): { type: 'expense' | 'income'; confidence: 'high' | 'medium' | 'low' | 'none' } {
  const lowerText = text.toLowerCase()

  // Income keywords (high confidence)
  const incomeKeywordsHigh = [
    'gaji', 'salary', 'income', 'pendapatan',
    'transfer masuk', 'transfer dari', 'dapat', 'terima',
    'bonus', 'tunjangan', 'uang masuk'
  ]

  // Income keywords (medium confidence)
  const incomeKeywordsMedium = [
    'masuk', 'diterima', 'dapat uang', 'uang masuk'
  ]

  // Expense keywords (high confidence)
  const expenseKeywordsHigh = [
    'beli', 'buy', 'purchase', 'bayar', 'pay', 'payment',
    'pembayaran', 'belanja', 'shopping', 'expense', 'pengeluaran',
    'tagihan', 'bill', 'bayar tagihan'
  ]

  // Expense keywords (medium confidence)
  const expenseKeywordsMedium = [
    'keluar', 'spend', 'habis', 'uang keluar', 'pengeluaran'
  ]

  // Check for income keywords
  for (const keyword of incomeKeywordsHigh) {
    if (lowerText.includes(keyword)) {
      return { type: 'income', confidence: 'high' }
    }
  }

  for (const keyword of incomeKeywordsMedium) {
    if (lowerText.includes(keyword)) {
      return { type: 'income', confidence: 'medium' }
    }
  }

  // Check for expense keywords
  for (const keyword of expenseKeywordsHigh) {
    if (lowerText.includes(keyword)) {
      return { type: 'expense', confidence: 'high' }
    }
  }

  for (const keyword of expenseKeywordsMedium) {
    if (lowerText.includes(keyword)) {
      return { type: 'expense', confidence: 'medium' }
    }
  }

  // Default to expense if no clear indicator (most transactions are expenses)
  return { type: 'expense', confidence: 'low' }
}

/**
 * Infer category from text
 */
function inferCategory(text: string, transactionType: 'expense' | 'income'): { category: string; confidence: 'high' | 'medium' | 'low' | 'none' } {
  const lowerText = text.toLowerCase()

  if (transactionType === 'income') {
    const incomeCategories: Record<string, string[]> = {
      'Gaji': ['gaji', 'salary', 'pendapatan tetap'],
      'Freelance': ['freelance', 'project', 'proyek', 'kontrak'],
      'Investasi': ['investasi', 'dividen', 'return', 'profit'],
      'Hadiah': ['hadiah', 'gift', 'bonus', 'tunjangan'],
    }

    for (const [category, keywords] of Object.entries(incomeCategories)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        return { category, confidence: 'high' }
      }
    }

    return { category: 'Gaji', confidence: 'low' } // Default for income
  } else {
    // Expense categories
    const expenseCategories: Record<string, string[]> = {
      'Makanan': ['makan', 'makanan', 'food', 'restaurant', 'warung', 'bakso', 'nasi', 'ayam', 'sate', 'mie', 'bakmi', 'soto', 'gudeg', 'rendang', 'nasi goreng', 'mie goreng'],
      'Transportasi': ['transport', 'transportasi', 'bensin', 'gas', 'fuel', 'parkir', 'parking', 'tol', 'toll', 'grab', 'gojek', 'taxi', 'ojek', 'angkot'],
      'Belanja': ['belanja', 'shopping', 'toko', 'store', 'mall', 'supermarket', 'minimarket', 'alfamart', 'indomaret'],
      'Tagihan': ['tagihan', 'bill', 'listrik', 'air', 'internet', 'wifi', 'telepon', 'phone', 'pulsa', 'paket data'],
      'Hiburan': ['hiburan', 'entertainment', 'ngopi', 'kopi', 'coffee', 'nonton', 'cinema', 'bioskop', 'game', 'games', 'netflix', 'spotify'],
      'Kesehatan': ['kesehatan', 'health', 'obat', 'medicine', 'apotek', 'pharmacy', 'dokter', 'doctor', 'rumah sakit', 'hospital', 'klinik', 'clinic'],
      'Lainnya': [] // Default fallback
    }

    for (const [category, keywords] of Object.entries(expenseCategories)) {
      if (category === 'Lainnya') continue
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        return { category, confidence: 'high' }
      }
    }

    // Check for lifestyle/entertainment patterns
    if (lowerText.includes('ngopi') || lowerText.includes('kopi') || lowerText.includes('coffee')) {
      return { category: 'Hiburan', confidence: 'high' }
    }

    return { category: 'Lainnya', confidence: 'low' } // Default for expense
  }
}

/**
 * Parse date from text
 * Handles: "hari ini", "kemarin", "yesterday", "today", etc.
 */
function parseDate(text: string): { date: string; confidence: 'high' | 'medium' | 'low' | 'none' } {
  const lowerText = text.toLowerCase()

  // Today keywords
  if (lowerText.includes('hari ini') || lowerText.includes('today') || lowerText.includes('sekarang')) {
    return { date: getTodayDateString(), confidence: 'high' }
  }

  // Yesterday keywords
  if (lowerText.includes('kemarin') || lowerText.includes('yesterday')) {
    return { date: getYesterdayDateString(), confidence: 'high' }
  }

  // Relative days
  const daysAgoMatch = lowerText.match(/(\d+)\s*(hari|lusa)\s*(yang\s*)?lalu/i)
  if (daysAgoMatch) {
    const daysAgo = parseInt(daysAgoMatch[1], 10)
    if (!isNaN(daysAgo) && daysAgo >= 1 && daysAgo <= 30) {
      const date = new Date()
      date.setDate(date.getDate() - daysAgo)
      return { date: date.toISOString().split('T')[0], confidence: 'medium' }
    }
  }

  // Date patterns (DD/MM/YYYY, DD-MM-YYYY)
  const datePatterns = [
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/,
    /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/,
  ]

  for (const pattern of datePatterns) {
    const match = lowerText.match(pattern)
    if (match) {
      let day: string, month: string, year: string

      if (match[1].length === 4) {
        // YYYY-MM-DD format
        year = match[1]
        month = match[2].padStart(2, '0')
        day = match[3].padStart(2, '0')
      } else {
        // DD/MM/YYYY format
        day = match[1].padStart(2, '0')
        month = match[2].padStart(2, '0')
        year = match[3]
        if (year.length === 2) {
          year = '20' + year
        }
      }

      try {
        const dateObj = new Date(`${year}-${month}-${day}`)
        if (!isNaN(dateObj.getTime())) {
          const dateString = dateObj.toISOString().split('T')[0]
          // Check if date is in the future
          const today = new Date()
          today.setHours(23, 59, 59, 999)
          if (dateObj > today) {
            return { date: getTodayDateString(), confidence: 'low' }
          }
          return { date: dateString, confidence: 'medium' }
        }
      } catch {
        // Invalid date, continue
      }
    }
  }

  // Default to today if no date found
  return { date: getTodayDateString(), confidence: 'low' }
}

/**
 * Extract description from text
 */
function extractDescription(text: string): string {
  // Remove amount patterns, date patterns, and type keywords
  let description = text
    .replace(/(?:rp\s*)?\d{1,3}(?:[.,]\d{3})*(?:\.\d{2})?/gi, '')
    .replace(/\d+\s*(ribu|rb|k|juta|jt|m|milyar|miliar|b)/gi, '')
    .replace(/(hari ini|kemarin|yesterday|today|sekarang)/gi, '')
    .replace(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/g, '')
    .replace(/\b(beli|buy|bayar|pay|gaji|salary|income|masuk|keluar)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()

  // If description is empty or too short, use original text (cleaned)
  if (!description || description.length < 3) {
    description = text.trim()
  }

  return description || 'Transaksi'
}

/**
 * Main parsing function
 * Parse natural language text to extract transaction data
 */
export function parseTextInput(text: string): TextParseResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!text || text.trim().length === 0) {
    return {
      success: false,
      data: {},
      confidence: {
        amount: 'none',
        type: 'none',
        category: 'none',
        date: 'none',
      },
      errors: ['Teks tidak boleh kosong'],
    }
  }

  // Parse amount
  const amountResult = parseAmount(text)
  if (amountResult.confidence === 'none') {
    errors.push('Tidak dapat mendeteksi jumlah transaksi. Pastikan teks mengandung jumlah seperti "20 ribu", "Rp 20.000", atau "5 juta".')
  } else if (amountResult.confidence === 'low') {
    warnings.push('Jumlah yang terdeteksi memiliki keyakinan rendah. Silakan periksa kembali sebelum menyimpan.')
  }

  // Detect transaction type
  const typeResult = detectTransactionType(text)
  if (typeResult.confidence === 'none') {
    warnings.push('Tipe transaksi tidak terdeteksi dengan jelas. Default: Expense. Gunakan kata seperti "beli", "bayar" untuk expense atau "gaji", "masuk" untuk income.')
  }

  // Infer category
  const categoryResult = inferCategory(text, typeResult.type)
  if (categoryResult.confidence === 'none') {
    warnings.push('Kategori tidak terdeteksi. Akan menggunakan kategori default.')
  } else if (categoryResult.confidence === 'low') {
    warnings.push('Kategori yang terdeteksi memiliki keyakinan rendah. Disarankan untuk memverifikasi sebelum menyimpan.')
  }

  // Parse date
  const dateResult = parseDate(text)
  if (dateResult.confidence === 'none') {
    warnings.push('Tanggal tidak terdeteksi. Menggunakan tanggal hari ini sebagai default.')
  }

  // Extract description
  const description = extractDescription(text)
  if (!description || description.trim().length < 3) {
    warnings.push('Deskripsi tidak dapat diekstrak dengan baik dari teks. Silakan periksa sebelum menyimpan.')
  }

  const data: Partial<TransactionFormData> = {
    type: typeResult.type,
    amount: amountResult.amount,
    description: description || 'Transaksi',
    category: categoryResult.category || (typeResult.type === 'income' ? 'Gaji' : 'Lainnya'),
    date: dateResult.date,
  }

  // Determine overall success - require at least amount and type
  const success = amountResult.confidence !== 'none' && amountResult.amount > 0 && typeResult.confidence !== 'none'

  return {
    success,
    data,
    confidence: {
      amount: amountResult.confidence,
      type: typeResult.confidence,
      category: categoryResult.confidence,
      date: dateResult.confidence,
    },
    errors: errors.length > 0 ? errors : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
  }
}

