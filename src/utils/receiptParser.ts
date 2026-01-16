import type { TransactionFormData } from '@/types/transaction'

/**
 * Receipt parsing result with confidence and metadata
 */
export interface ReceiptParseResult {
  detectedAmount: number
  confidenceLevel: 'high' | 'medium' | 'low'
  sourceKeyword?: string
  rawOcrText: string
  normalizedText: string
  items?: ReceiptItem[]
  date?: string
  merchant?: string
}

export interface ReceiptItem {
  name: string
  price: number
  quantity?: number
}

/**
 * Normalize OCR output:
 * - Remove extra spaces & symbols
 * - Standardize number formats (58,000, 58.000 → 58000)
 */
function normalizeOcrText(text: string): string {
  return text
    .replace(/\s+/g, ' ') // Multiple spaces to single space
    .replace(/[^\w\s\d.,:/-]/g, '') // Remove special symbols except common ones
    .trim()
}

/**
 * Normalize number string to pure digits
 * Handles: 58,000, 58.000, 58 000 → 58000
 */
function normalizeNumber(numStr: string): string {
  return numStr
    .replace(/[,\s]/g, '') // Remove commas and spaces
    .replace(/\.(?=\d{3})/g, '') // Remove dots used as thousand separators (but keep decimal dots)
    .replace(/[^\d]/g, '') // Remove all non-digits
}

/**
 * Extract numbers from text with their context
 */
interface NumberMatch {
  value: number
  original: string
  line: string
  lineIndex: number
  position: number
}

function extractNumbers(text: string): NumberMatch[] {
  const lines = text.split('\n')
  const numbers: NumberMatch[] = []

  lines.forEach((line, lineIndex) => {
    // Match numbers with various formats: 10000, 10.000, 10,000, Rp 10000, etc.
    const numberPattern = /(?:Rp\s?)?(\d{1,3}(?:[.,]\d{3})*(?:\.\d{2})?)/gi
    const matches = Array.from(line.matchAll(numberPattern))

    matches.forEach((match) => {
      if (match.index !== undefined) {
        const normalized = normalizeNumber(match[1])
        const value = parseFloat(normalized)
        if (!isNaN(value) && value > 0) {
          numbers.push({
            value,
            original: match[0],
            line: line.trim(),
            lineIndex,
            position: match.index,
          })
        }
      }
    })
  })

  return numbers
}

/**
 * Classify numbers into categories:
 * ❌ Non-price: date, time, bill number, queue number, qty (1x, 250x)
 * ⚠️ Supporting amounts: subtotal, tax
 * ✅ Target amount: TOTAL
 */
type NumberCategory = 'non-price' | 'supporting' | 'target' | 'item-price' | 'unknown'

function classifyNumber(
  number: NumberMatch,
  line: string,
  allNumbers: NumberMatch[]
): NumberCategory {
  const lowerLine = line.toLowerCase()

  // ❌ Non-price indicators
  const nonPricePatterns = [
    /:\d{1,2}/, // Time pattern (e.g., 14:30)
    /\d{1,2}\/\d{1,2}\/\d{2,4}/, // Date pattern
    /\d+x/, // Quantity pattern (e.g., 1x, 250x)
    /\b(no|bil|panggil|pos|csh|queue|antrian)\s*\d+/i, // Keywords with numbers
    /\b\d+\s*(no|bil|panggil|pos|csh|queue|antrian)/i,
  ]

  for (const pattern of nonPricePatterns) {
    if (pattern.test(lowerLine)) {
      return 'non-price'
    }
  }

  // ⚠️ Supporting amounts (subtotal, tax, etc.)
  const supportingPatterns = [
    /\b(subtotal|sub\s*total|sebelum\s*pajak|before\s*tax)/i,
    /\b(tax|pajak|ppn|pph)/i,
    /\b(service|servis|layanan)/i,
    /\b(discount|diskon|potongan)/i,
  ]

  for (const pattern of supportingPatterns) {
    if (pattern.test(lowerLine)) {
      return 'supporting'
    }
  }

  // ✅ Target amount (TOTAL)
  const targetPatterns = [
    /\b(total|total\s*bayar|grand\s*total|jumlah|bayar|pembayaran)\b/i,
  ]

  for (const pattern of targetPatterns) {
    if (pattern.test(lowerLine)) {
      return 'target'
    }
  }

  // Check if it's likely an item price (smaller amounts, not near total keywords)
  const isLargeAmount = number.value >= 1000
  const hasTotalNearby = allNumbers.some(
    (n) =>
      n.lineIndex === number.lineIndex &&
      Math.abs(n.position - number.position) < 20 &&
      /total|bayar|jumlah/i.test(n.line)
  )

  if (isLargeAmount && !hasTotalNearby) {
    // Could be item price or total - will be determined by context
    return 'unknown'
  }

  return 'unknown'
}

/**
 * Tier 1: Detect keywords (TOTAL, TOTAL BAYAR, GRAND TOTAL, JUMLAH)
 * Extract nearest valid number
 */
function detectTotalTier1(text: string, numbers: NumberMatch[]): {
  amount: number
  confidence: 'high' | 'medium' | 'low'
  keyword?: string
} | null {
  const lines = text.split('\n')
  const targetKeywords = [
    { pattern: /\b(total\s*bayar|bayar)\b/i, weight: 1.0 },
    { pattern: /\b(grand\s*total)\b/i, weight: 0.95 },
    { pattern: /\b(total)\b/i, weight: 0.9 },
    { pattern: /\b(jumlah)\b/i, weight: 0.85 },
    { pattern: /\b(pembayaran)\b/i, weight: 0.8 },
  ]

  let bestMatch: {
    amount: number
    confidence: 'high' | 'medium' | 'low'
    keyword: string
    distance: number
  } | null = null

  lines.forEach((line, lineIndex) => {
    const lowerLine = line.toLowerCase()

    for (const { pattern, weight } of targetKeywords) {
      const keywordMatch = lowerLine.match(pattern)
      if (keywordMatch) {
        // Find numbers in this line or nearby lines
        const nearbyNumbers = numbers.filter(
          (n) => Math.abs(n.lineIndex - lineIndex) <= 1 && n.value >= 1000
        )

        for (const num of nearbyNumbers) {
          const distance = Math.abs(num.lineIndex - lineIndex) * 10 + Math.abs(num.position - (keywordMatch.index || 0))
          const confidence: 'high' | 'medium' | 'low' = weight > 0.9 ? 'high' : weight > 0.85 ? 'medium' : 'low'

          if (!bestMatch || distance < bestMatch.distance || (distance === bestMatch.distance && weight > (targetKeywords.find((k) => k.pattern.test(bestMatch!.keyword))?.weight || 0))) {
            bestMatch = {
              amount: num.value,
              confidence,
              keyword: keywordMatch[0],
              distance,
            }
          }
        }
      }
    }
  })

  if (bestMatch) {
    return {
      amount: bestMatch.amount,
      confidence: bestMatch.confidence,
      keyword: bestMatch.keyword,
    }
  }

  return null
}

/**
 * Tier 2: Select the largest valid number (> threshold, e.g. IDR 1,000)
 */
function detectTotalTier2(numbers: NumberMatch[], threshold: number = 1000): {
  amount: number
  confidence: 'low'
} | null {
  // Filter out non-price numbers
  const validNumbers = numbers
    .filter((n) => {
      const category = classifyNumber(n, n.line, numbers)
      return category !== 'non-price' && n.value >= threshold
    })
    .sort((a, b) => b.value - a.value)

  if (validNumbers.length > 0) {
    return {
      amount: validNumbers[0].value,
      confidence: 'low',
    }
  }

  return null
}

/**
 * Detect item lines (item name on left, price on right)
 */
function detectItems(text: string, numbers: NumberMatch[]): ReceiptItem[] {
  const lines = text.split('\n')
  const items: ReceiptItem[] = []
  const processedNumbers = new Set<number>()

  lines.forEach((line, lineIndex) => {
    const trimmedLine = line.trim()
    if (trimmedLine.length < 3) return

    // Look for item-price patterns
    // Pattern: Item name ... price (price at end of line)
    const lineNumbers = numbers.filter((n) => n.lineIndex === lineIndex && n.value >= 1000)

    for (const num of lineNumbers) {
      if (processedNumbers.has(num.value)) continue

      // Check if this number is at the end of the line (likely a price)
      const pricePosition = num.position + num.original.length
      const lineLength = trimmedLine.length
      const isAtEnd = pricePosition >= lineLength - 5 // Within 5 chars of end

      if (isAtEnd) {
        // Extract item name (everything before the price)
        const itemName = trimmedLine.substring(0, num.position).trim()

        // Skip if item name is too short or contains total keywords
        if (
          itemName.length >= 2 &&
          itemName.length <= 100 &&
          !/total|bayar|jumlah|subtotal|tax|pajak/i.test(itemName)
        ) {
          // Check for quantity (e.g., "1x", "2x")
          const qtyMatch = itemName.match(/(\d+)\s*x\s*$/i)
          const quantity = qtyMatch ? parseInt(qtyMatch[1], 10) : 1

          items.push({
            name: itemName.replace(/\d+\s*x\s*$/i, '').trim(),
            price: num.value,
            quantity: quantity > 1 ? quantity : undefined,
          })

          processedNumbers.add(num.value)
        }
      }
    }
  })

  return items
}

/**
 * Get today's date string in YYYY-MM-DD format
 */
function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0]
}

/**
 * Check if a date is in the future
 */
function isDateInFuture(dateString: string): boolean {
  if (!dateString) return false
  const date = new Date(dateString)
  const today = new Date()
  today.setHours(23, 59, 59, 999) // End of today
  return date > today
}

/**
 * Extract date from receipt text
 * Returns today's date if extraction fails or date is in the future
 */
function extractDate(text: string): string {
  const datePatterns = [
    // DD/MM/YYYY or DD-MM-YYYY
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/,
    // YYYY/MM/DD or YYYY-MM-DD
    /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/,
  ]

  for (const pattern of datePatterns) {
    const match = text.match(pattern)
    if (match) {
      let day: string, month: string, year: string

      if (match[1].length === 4) {
        // YYYY-MM-DD format
        year = match[1]
        month = match[2].padStart(2, '0')
        day = match[3].padStart(2, '0')
      } else {
        // DD/MM/YYYY or MM/DD/YYYY format (assume DD/MM for Indonesian receipts)
        day = match[1].padStart(2, '0')
        month = match[2].padStart(2, '0')
        year = match[3]
        if (year.length === 2) {
          year = '20' + year
        }
      }

      try {
        const dateObj = new Date(`${year}-${month}-${day}`)
        if (!isNaN(dateObj.getTime()) && dateObj.getFullYear() >= 2020 && dateObj.getFullYear() <= 2100) {
          const dateString = dateObj.toISOString().split('T')[0]
          // If date is in the future, return today instead
          if (isDateInFuture(dateString)) {
            return getTodayDateString()
          }
          return dateString
        }
      } catch {
        // Invalid date, continue
      }
    }
  }

  // Default to today if no valid date found
  return getTodayDateString()
}

/**
 * Extract merchant/store name
 */
function extractMerchant(text: string): string | undefined {
  const lines = text.split('\n').slice(0, 10) // Check first 10 lines

  for (const line of lines) {
    const trimmed = line.trim()
    // Look for lines that are likely merchant names (all caps, reasonable length)
    if (
      trimmed.length >= 3 &&
      trimmed.length <= 50 &&
      /^[A-Z\s&]+$/.test(trimmed) &&
      !/TOTAL|RECEIPT|INVOICE|DATE|TIME/i.test(trimmed)
    ) {
      return trimmed
    }
  }

  return undefined
}

/**
 * Main parsing function
 * Parse OCR text from receipt to extract transaction data
 */
export function parseReceiptText(text: string): Partial<TransactionFormData> | Partial<TransactionFormData>[] {
  // A1: Normalize OCR output
  const normalizedText = normalizeOcrText(text)

  // Extract all numbers with context
  const numbers = extractNumbers(normalizedText)

  // A2-A3: Detect total amount with priority logic
  let detectedAmount = 0
  let confidenceLevel: 'high' | 'medium' | 'low' = 'low'
  let sourceKeyword: string | undefined

  // Tier 1: Try keyword-based detection
  const tier1Result = detectTotalTier1(normalizedText, numbers)
  if (tier1Result) {
    detectedAmount = tier1Result.amount
    confidenceLevel = tier1Result.confidence
    sourceKeyword = tier1Result.keyword
  } else {
    // Tier 2: Fallback to largest number
    const tier2Result = detectTotalTier2(numbers, 1000)
    if (tier2Result) {
      detectedAmount = tier2Result.amount
      confidenceLevel = tier2Result.confidence
    }
  }

  // Extract additional metadata (extractDate now always returns a valid date, defaulting to today)
  const date = extractDate(normalizedText)
  const merchant = extractMerchant(normalizedText)

  // B1: Detect items (optional, for multi-item receipts)
  const items = detectItems(normalizedText, numbers)

  // B2: If multiple items detected and total matches, return array
  if (items.length > 1 && detectedAmount > 0) {
    // Calculate sum of items
    const itemsSum = items.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0)

    // If items sum is close to detected total (within 10%), return items
    if (Math.abs(itemsSum - detectedAmount) / detectedAmount < 0.1) {
      return items.map((item) => ({
        type: 'expense' as const,
        amount: item.price * (item.quantity || 1),
        description: item.quantity && item.quantity > 1 ? `${item.name} (${item.quantity}x)` : item.name,
        category: inferCategory(item.name),
        date,
      }))
    }
  }

  // Single transaction fallback
  const result: Partial<TransactionFormData> = {
    type: 'expense',
    amount: detectedAmount,
    description: merchant || 'Receipt Transaction',
    category: merchant ? inferCategory(merchant) : 'Lainnya',
    date,
  }

  return result
}

/**
 * Infer category from text
 */
function inferCategory(text: string): string {
  const lowerText = text.toLowerCase()
  const categoryKeywords: Record<string, string[]> = {
    Makanan: ['restaurant', 'cafe', 'food', 'grocery', 'market', 'supermarket', 'warung', 'makan', 'minum', 'kopi', 'bakso', 'nasi'],
    Transportasi: ['gas', 'fuel', 'bensin', 'taxi', 'uber', 'grab', 'gojek', 'parking', 'parkir', 'toll', 'tol'],
    Belanja: ['store', 'shop', 'toko', 'mall', 'retail', 'clothing', 'pakaian', 'shoes', 'sepatu'],
    Tagihan: ['utility', 'listrik', 'air', 'internet', 'phone', 'telepon', 'cable', 'bill', 'tagihan'],
    Hiburan: ['movie', 'cinema', 'bioskop', 'theater', 'game', 'entertainment'],
    Kesehatan: ['pharmacy', 'apotek', 'drug', 'obat', 'hospital', 'rumah sakit', 'clinic', 'klinik', 'doctor', 'dokter'],
  }

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some((keyword) => lowerText.includes(keyword))) {
      return category
    }
  }

  return 'Lainnya'
}

/**
 * Parse receipt with detailed result (for debugging and advanced features)
 */
export function parseReceiptTextDetailed(text: string): ReceiptParseResult {
  const normalizedText = normalizeOcrText(text)
  const numbers = extractNumbers(normalizedText)

  let detectedAmount = 0
  let confidenceLevel: 'high' | 'medium' | 'low' = 'low'
  let sourceKeyword: string | undefined

  const tier1Result = detectTotalTier1(normalizedText, numbers)
  if (tier1Result) {
    detectedAmount = tier1Result.amount
    confidenceLevel = tier1Result.confidence
    sourceKeyword = tier1Result.keyword
  } else {
    const tier2Result = detectTotalTier2(numbers, 1000)
    if (tier2Result) {
      detectedAmount = tier2Result.amount
      confidenceLevel = tier2Result.confidence
    }
  }

  const items = detectItems(normalizedText, numbers)
  const extractedDate = extractDate(normalizedText)
  // Validate date is not in future (extractDate already handles this, but double-check)
  const today = getTodayDateString()
  const date = isDateInFuture(extractedDate) ? today : extractedDate
  const merchant = extractMerchant(normalizedText)

  return {
    detectedAmount,
    confidenceLevel,
    sourceKeyword,
    rawOcrText: text,
    normalizedText,
    items: items.length > 0 ? items : undefined,
    date,
    merchant,
  }
}
