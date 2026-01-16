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

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const MIN_AMOUNT_THRESHOLD = 100 // Minimum valid amount in IDR (lowered for better detection)
const MAX_AMOUNT_THRESHOLD = 1000000000 // Maximum reasonable amount (1 billion IDR)
const ITEM_SUM_TOLERANCE = 0.25 // 25% tolerance for item sum vs total (more flexible)

// Indonesian receipt keywords - ordered by priority
const TOTAL_KEYWORDS = [
  { pattern: /\b(total\s*bayar|bayar\s*total)\b/i, weight: 1.0, label: 'TOTAL BAYAR' },
  { pattern: /\b(grand\s*total|total\s*grand)\b/i, weight: 0.95, label: 'GRAND TOTAL' },
  { pattern: /\b(total\s*akhir)\b/i, weight: 0.93, label: 'TOTAL AKHIR' },
  { pattern: /\b(total\s*)\b/i, weight: 0.9, label: 'TOTAL' },
  { pattern: /\b(jumlah\s*bayar|bayar)\b/i, weight: 0.88, label: 'JUMLAH BAYAR' },
  { pattern: /\b(jumlah)\b/i, weight: 0.85, label: 'JUMLAH' },
  { pattern: /\b(pembayaran)\b/i, weight: 0.8, label: 'PEMBAYARAN' },
  { pattern: /\b(kembalian)\b/i, weight: 0.3, label: 'KEMBALIAN' }, // Low priority, usually not total
]

const NON_PRICE_PATTERNS = [
  /:\d{1,2}(?:\s*[ap]m)?/i, // Time: 14:30, 14:30 PM
  /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/, // Date: 01/01/2024
  /\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}/, // Date: 2024/01/01
  /\d+\s*x\s*\d+/i, // Quantity: 2x, 3x
  /\b(no|bil|panggil|pos|csh|queue|antrian|kasir|kas|kassa)\s*[:\s]*\d+/i,
  /\b\d+\s*(no|bil|panggil|pos|csh|queue|antrian|kasir|kas|kassa)\b/i,
  /\b(meja|table)\s*\d+/i, // Table number
  /\b\d+\s*(meja|table)\b/i,
]

const SUPPORTING_AMOUNT_PATTERNS = [
  /\b(subtotal|sub\s*total|sebelum\s*pajak|before\s*tax|harga\s*sebelum)\b/i,
  /\b(pajak|ppn|pph|tax|vat)\b/i,
  /\b(service|servis|layanan|biaya\s*layanan)\b/i,
  /\b(discount|diskon|potongan|promo)\b/i,
  /\b(tip|tips)\b/i,
]

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface NumberMatch {
  value: number
  original: string
  line: string
  lineIndex: number
  position: number
  context: string // Surrounding text for better classification
}

type NumberCategory = 'non-price' | 'supporting' | 'target' | 'item-price' | 'unknown'

interface TotalDetectionResult {
  amount: number
  confidence: 'high' | 'medium' | 'low'
  keyword?: string
  method: 'keyword' | 'largest' | 'context'
}

// ============================================================================
// TEXT NORMALIZATION
// ============================================================================

/**
 * Normalize OCR output for better parsing
 */
function normalizeOcrText(text: string): string {
  return text
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/\r/g, '\n')
    .replace(/\s+/g, ' ') // Multiple spaces to single space
    .replace(/[^\w\s\d.,:/-]/g, '') // Remove special symbols except common ones
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n')
    .trim()
}

/**
 * Normalize number string to pure digits
 * Handles Indonesian formats: 58.000, 58,000, 58 000 → 58000
 */
function normalizeNumber(numStr: string): string {
  // Remove currency symbols
  let cleaned = numStr.replace(/[RpIDR\s]/gi, '')
  
  // Handle Indonesian thousand separators (dot or comma)
  // Pattern: digits.digits or digits,digits (where digits after separator are 3 digits)
  cleaned = cleaned.replace(/(\d{1,3})[.,](\d{3})/g, '$1$2')
  
  // Remove remaining dots and commas (might be decimal separators in some formats)
  cleaned = cleaned.replace(/[.,]/g, '')
  
  // Extract only digits
  return cleaned.replace(/[^\d]/g, '')
}

// ============================================================================
// NUMBER EXTRACTION
// ============================================================================

/**
 * Extract all numbers from text with context
 */
function extractNumbers(text: string): NumberMatch[] {
  const lines = text.split('\n')
  const numbers: NumberMatch[] = []

  lines.forEach((line, lineIndex) => {
    // Enhanced pattern: matches various Indonesian number formats (more flexible)
    const patterns = [
      /(?:Rp|IDR|RP|rp)\s*(\d{1,3}(?:[.,]\s?\d{3})*(?:\.\d{2})?)/gi, // With currency prefix: Rp 10.000
      /(\d{1,3}(?:[.,]\d{3})+(?:\.\d{2})?)/g, // Number with separators: 10.000 or 10,000
      /(\d{1,3}\s+\d{3}(?:\s+\d{3})*)/g, // Space-separated: 10 000 000
      /(\d{3,})/g, // Numbers with 3+ digits (lowered from 4+ for better detection)
    ]

    patterns.forEach(pattern => {
      const matches = Array.from(line.matchAll(pattern))
      matches.forEach((match) => {
        if (match.index !== undefined) {
          const normalized = normalizeNumber(match[1] || match[0])
          const value = parseFloat(normalized)
          
          // Accept any positive number, filter later by threshold
          if (!isNaN(value) && value > 0 && value <= MAX_AMOUNT_THRESHOLD) {
            // Get context (20 chars before and after)
            const start = Math.max(0, match.index - 20)
            const end = Math.min(line.length, match.index + match[0].length + 20)
            const context = line.substring(start, end).toLowerCase()

            numbers.push({
              value,
              original: match[0],
              line: line.trim(),
              lineIndex,
              position: match.index,
              context,
            })
          }
        }
      })
    })
  })

  // Remove duplicates (same value in same position)
  const uniqueNumbers: NumberMatch[] = []
  const seen = new Set<string>()
  
  numbers.forEach(num => {
    const key = `${num.lineIndex}-${num.position}-${num.value}`
    if (!seen.has(key)) {
      seen.add(key)
      uniqueNumbers.push(num)
    }
  })

  return uniqueNumbers.sort((a, b) => b.value - a.value) // Sort by value descending
}

// ============================================================================
// NUMBER CLASSIFICATION
// ============================================================================

/**
 * Classify a number into categories based on context
 */
function classifyNumber(
  number: NumberMatch,
  allNumbers: NumberMatch[]
): NumberCategory {
  const lowerLine = number.line.toLowerCase()
  const context = number.context

  // ❌ Non-price: date, time, bill number, queue number, qty
  for (const pattern of NON_PRICE_PATTERNS) {
    if (pattern.test(lowerLine) || pattern.test(context)) {
      return 'non-price'
    }
  }

  // ✅ Target amount: TOTAL keywords
  for (const { pattern } of TOTAL_KEYWORDS) {
    if (pattern.test(lowerLine) || pattern.test(context)) {
      return 'target'
    }
  }

  // ⚠️ Supporting amounts: subtotal, tax, etc.
  for (const pattern of SUPPORTING_AMOUNT_PATTERNS) {
    if (pattern.test(lowerLine) || pattern.test(context)) {
      return 'supporting'
    }
  }

  // Check if it's likely an item price
  // Item prices are usually smaller and not near total keywords
  const hasTotalNearby = allNumbers.some(
    (n) =>
      n.lineIndex === number.lineIndex &&
      Math.abs(n.position - number.position) < 30 &&
      TOTAL_KEYWORDS.some(kw => kw.pattern.test(n.line.toLowerCase()))
  )

  if (!hasTotalNearby && number.value < 1000000) {
    return 'item-price'
  }

  return 'unknown'
}

// ============================================================================
// TOTAL AMOUNT DETECTION
// ============================================================================

/**
 * Tier 1: Detect total using keyword matching (highest priority)
 */
function detectTotalByKeyword(text: string, numbers: NumberMatch[]): TotalDetectionResult | null {
  const lines = text.split('\n')
  let bestMatch: {
    amount: number
    confidence: 'high' | 'medium' | 'low'
    keyword: string
    distance: number
    weight: number
  } | null = null

  lines.forEach((line, lineIndex) => {
    const lowerLine = line.toLowerCase()

    for (const { pattern, weight, label } of TOTAL_KEYWORDS) {
      const keywordMatch = lowerLine.match(pattern)
      if (keywordMatch && keywordMatch.index !== undefined) {
        // Find numbers in this line or next 2 lines (more flexible threshold)
        const nearbyNumbers = numbers.filter(
          (n) => 
            Math.abs(n.lineIndex - lineIndex) <= 2 && 
            n.value >= 100 && // Lower threshold for keyword-based detection
            classifyNumber(n, numbers) !== 'non-price'
        )

        for (const num of nearbyNumbers) {
          // Calculate distance (line distance + character distance)
          const lineDistance = Math.abs(num.lineIndex - lineIndex)
          const charDistance = Math.abs(num.position - keywordMatch.index)
          const distance = lineDistance * 50 + charDistance

          // Determine confidence based on weight and distance
          let confidence: 'high' | 'medium' | 'low'
          if (weight >= 0.9 && distance < 50) {
            confidence = 'high'
          } else if (weight >= 0.85 && distance < 100) {
            confidence = 'medium'
          } else {
            confidence = 'low'
          }

          // Prefer closer matches with higher weight
          if (
            !bestMatch ||
            (weight > bestMatch.weight && distance < bestMatch.distance * 2) ||
            (distance < bestMatch.distance && weight >= bestMatch.weight * 0.9)
          ) {
            bestMatch = {
              amount: num.value,
              confidence,
              keyword: label,
              distance,
              weight,
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
      method: 'keyword',
    }
  }

  return null
}

/**
 * Tier 2: Detect total by context analysis
 * Looks for patterns like: "TOTAL: Rp 50.000" or "Bayar: 50000"
 */
function detectTotalByContext(text: string, numbers: NumberMatch[]): TotalDetectionResult | null {
  const lines = text.split('\n')
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase()
    
    // Look for colon-separated patterns: "TOTAL: 50000" or "Bayar : 50000"
    const colonPattern = /(total|bayar|jumlah|pembayaran)\s*[:\-]\s*(\d+)/i
    const match = line.match(colonPattern)
    
    if (match) {
      const numStr = match[2]
      const normalized = normalizeNumber(numStr)
      const value = parseFloat(normalized)
      
      if (!isNaN(value) && value >= MIN_AMOUNT_THRESHOLD && value <= MAX_AMOUNT_THRESHOLD) {
        // Find matching number in our extracted numbers
        const matchingNumber = numbers.find(
          n => Math.abs(n.value - value) < 100 && Math.abs(n.lineIndex - i) <= 1
        )
        
        if (matchingNumber) {
          return {
            amount: matchingNumber.value,
            confidence: 'medium',
            keyword: match[1].toUpperCase(),
            method: 'context',
          }
        }
      }
    }
  }
  
  return null
}

/**
 * Tier 3: Select largest valid number (fallback)
 */
function detectTotalByLargest(numbers: NumberMatch[]): TotalDetectionResult | null {
  // Filter out non-price numbers and get valid candidates (more flexible)
  const validNumbers = numbers
    .filter((n) => {
      const category = classifyNumber(n, numbers)
      return category !== 'non-price' && 
             category !== 'supporting' &&
             n.value >= 100 // Lower threshold for fallback detection
    })
    .sort((a, b) => b.value - a.value)

  if (validNumbers.length > 0) {
    const largest = validNumbers[0]
    const secondLargest = validNumbers[1]
    
    // More flexible: if largest is bigger OR if there's only one number, use it
    if (!secondLargest || largest.value > secondLargest.value * 1.2) { // Lowered from 1.5
      return {
        amount: largest.value,
        confidence: 'low',
        method: 'largest',
      }
    }
    
    // If numbers are close, prefer the one that appears later in receipt (usually total is at bottom)
    if (secondLargest && largest.value <= secondLargest.value * 1.2) {
      // Use the one that appears later (higher line index)
      const laterNumber = largest.lineIndex > secondLargest.lineIndex ? largest : secondLargest
      return {
        amount: laterNumber.value,
        confidence: 'low',
        method: 'largest',
      }
    }
  }

  return null
}

/**
 * Main total detection function with priority logic
 */
function detectTotal(text: string, numbers: NumberMatch[]): TotalDetectionResult | null {
  // Tier 1: Keyword-based (highest priority)
  const keywordResult = detectTotalByKeyword(text, numbers)
  if (keywordResult) {
    return keywordResult
  }

  // Tier 2: Context-based
  const contextResult = detectTotalByContext(text, numbers)
  if (contextResult) {
    return contextResult
  }

  // Tier 3: Largest number (fallback)
  const largestResult = detectTotalByLargest(numbers)
  if (largestResult) {
    return largestResult
  }

  return null
}

// ============================================================================
// ITEM DETECTION
// ============================================================================

/**
 * Detect item lines from receipt
 */
function detectItems(text: string, numbers: NumberMatch[]): ReceiptItem[] {
  const lines = text.split('\n')
  const items: ReceiptItem[] = []
  const processedNumbers = new Set<string>()

  lines.forEach((line, lineIndex) => {
    const trimmedLine = line.trim()
    if (trimmedLine.length < 3) return

    // Get numbers in this line (more flexible for item detection)
    const lineNumbers = numbers.filter(
      (n) => n.lineIndex === lineIndex && 
             n.value >= 100 && // Lower threshold for items
             (classifyNumber(n, numbers) === 'item-price' || classifyNumber(n, numbers) === 'unknown')
    )

    for (const num of lineNumbers) {
      const key = `${lineIndex}-${num.value}`
      if (processedNumbers.has(key)) continue

      // Check if number is at the end of line (likely a price)
      const pricePosition = num.position + num.original.length
      const isAtEnd = pricePosition >= trimmedLine.length - 8

      if (isAtEnd) {
        // Extract item name (everything before the price)
        const itemName = trimmedLine.substring(0, num.position).trim()

        // Validate item name
        if (
          itemName.length >= 2 &&
          itemName.length <= 100 &&
          !TOTAL_KEYWORDS.some(kw => kw.pattern.test(itemName)) &&
          !SUPPORTING_AMOUNT_PATTERNS.some(p => p.test(itemName))
        ) {
          // Extract quantity if present
          const qtyMatch = itemName.match(/(\d+)\s*x\s*$/i) || itemName.match(/^(\d+)\s*x\s*/i)
          const quantity = qtyMatch ? parseInt(qtyMatch[1], 10) : 1

          items.push({
            name: itemName.replace(/\d+\s*x\s*$/i, '').replace(/^\d+\s*x\s*/i, '').trim(),
            price: num.value,
            quantity: quantity > 1 ? quantity : undefined,
          })

          processedNumbers.add(key)
        }
      }
    }
  })

  return items
}

// ============================================================================
// DATE EXTRACTION
// ============================================================================

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
  today.setHours(23, 59, 59, 999)
  return date > today
}

/**
 * Extract and validate date from receipt text
 */
function extractDate(text: string): string {
  const datePatterns = [
    // DD/MM/YYYY or DD-MM-YYYY (Indonesian format)
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/,
    // YYYY/MM/DD or YYYY-MM-DD
    /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/,
    // DD MM YYYY (with spaces)
    /(\d{1,2})\s+(\d{1,2})\s+(\d{2,4})/,
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
        // DD/MM/YYYY format (Indonesian standard)
        day = match[1].padStart(2, '0')
        month = match[2].padStart(2, '0')
        year = match[3]
        if (year.length === 2) {
          year = '20' + year
        }
      }

      try {
        const dateObj = new Date(`${year}-${month}-${day}`)
        if (!isNaN(dateObj.getTime()) && 
            dateObj.getFullYear() >= 2020 && 
            dateObj.getFullYear() <= 2100) {
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

  return getTodayDateString()
}

// ============================================================================
// MERCHANT EXTRACTION
// ============================================================================

/**
 * Extract merchant/store name from receipt
 */
function extractMerchant(text: string): string | undefined {
  const lines = text.split('\n').slice(0, 15) // Check first 15 lines

  for (const line of lines) {
    const trimmed = line.trim()
    
    // Look for merchant name patterns:
    // - All caps with reasonable length
    // - Contains letters (not just numbers/symbols)
    // - Doesn't contain receipt keywords
    if (
      trimmed.length >= 3 &&
      trimmed.length <= 60 &&
      /[A-Za-z]/.test(trimmed) && // Contains letters
      !/^(TOTAL|RECEIPT|INVOICE|DATE|TIME|NO|BIL|PANGIL|POS|CSH)/i.test(trimmed) &&
      !/\d{4,}/.test(trimmed) // Not just a long number
    ) {
      // Prefer lines that are mostly uppercase (common for store names)
      const upperCaseRatio = (trimmed.match(/[A-Z]/g) || []).length / trimmed.length
      if (upperCaseRatio > 0.5 || trimmed.length < 20) {
        return trimmed
      }
    }
  }

  return undefined
}

// ============================================================================
// CATEGORY INFERENCE
// ============================================================================

/**
 * Infer category from text using keyword matching
 */
function inferCategory(text: string): string {
  const lowerText = text.toLowerCase()
  
  const categoryKeywords: Record<string, string[]> = {
    Makanan: [
      'restaurant', 'cafe', 'food', 'grocery', 'market', 'supermarket', 'warung', 
      'makan', 'minum', 'kopi', 'bakso', 'nasi', 'ayam', 'sate', 'mie', 'bubur',
      'indomaret', 'alfamart', 'superindo', 'carrefour', 'hypermart', 'transmart',
      'kfc', 'mcd', 'pizza', 'burger', 'fried chicken'
    ],
    Transportasi: [
      'gas', 'fuel', 'bensin', 'solar', 'pertamax', 'taxi', 'uber', 'grab', 'gojek',
      'parking', 'parkir', 'toll', 'tol', 'ojek', 'angkot', 'bus', 'kereta', 'train',
      'go-ride', 'go-car', 'grabcar', 'bluebird'
    ],
    Belanja: [
      'store', 'shop', 'toko', 'mall', 'retail', 'clothing', 'pakaian', 'shoes', 'sepatu',
      'baju', 'celana', 'kaos', 'jaket', 'tas', 'elektronik', 'electronic', 'handphone',
      'laptop', 'komputer', 'unilever', 'wardah', 'sariayu'
    ],
    Tagihan: [
      'utility', 'listrik', 'air', 'internet', 'phone', 'telepon', 'cable', 'bill', 
      'tagihan', 'pln', 'pdam', 'indihome', 'first media', 'biznet', 'xl', 'telkomsel',
      'tri', 'smartfren', 'by.u', 'kartu', 'pulsa', 'paket data'
    ],
    Hiburan: [
      'movie', 'cinema', 'bioskop', 'theater', 'game', 'entertainment', 'netflix',
      'spotify', 'youtube', 'disney', 'vidi', 'iflix', 'tiket', 'concert', 'konser'
    ],
    Kesehatan: [
      'pharmacy', 'apotek', 'drug', 'obat', 'hospital', 'rumah sakit', 'clinic', 
      'klinik', 'doctor', 'dokter', 'kimia farma', 'guardian', 'century', 'viva',
      'halodoc', 'alodokter', 'vitamin', 'suplemen'
    ],
  }

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some((keyword) => lowerText.includes(keyword))) {
      return category
    }
  }

  return 'Lainnya'
}

// ============================================================================
// MAIN PARSING FUNCTIONS
// ============================================================================

/**
 * Main parsing function - extracts transaction data from OCR text
 */
export function parseReceiptText(text: string): Partial<TransactionFormData> | Partial<TransactionFormData>[] {
  // Normalize OCR output
  const normalizedText = normalizeOcrText(text)

  // Extract all numbers with context
  const numbers = extractNumbers(normalizedText)

  if (numbers.length === 0) {
    // No numbers found - return default
    return {
      type: 'expense',
      amount: 0,
      description: 'Receipt Transaction',
      category: 'Lainnya',
      date: getTodayDateString(),
    }
  }

  // Detect total amount with priority logic
  const totalResult = detectTotal(normalizedText, numbers)
  const detectedAmount = totalResult?.amount || 0
  const confidenceLevel = totalResult?.confidence || 'low'
  const sourceKeyword = totalResult?.keyword

  // Extract metadata
  const date = extractDate(normalizedText)
  const merchant = extractMerchant(normalizedText)

  // Detect items (for multi-item receipts)
  const items = detectItems(normalizedText, numbers)

  // If multiple items detected and sum matches total, return array
  if (items.length > 1 && detectedAmount > 0) {
    const itemsSum = items.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0)
    const difference = Math.abs(itemsSum - detectedAmount)
    const tolerance = detectedAmount * ITEM_SUM_TOLERANCE

    // If items sum is close to detected total (within tolerance), return items
    if (difference <= tolerance) {
      return items.map((item) => ({
        type: 'expense' as const,
        amount: item.price * (item.quantity || 1),
        description: item.quantity && item.quantity > 1 
          ? `${item.name} (${item.quantity}x)` 
          : item.name,
        category: inferCategory(item.name),
        date,
      }))
    }
  }

  // Single transaction
  return {
    type: 'expense',
    amount: detectedAmount,
    description: merchant || 'Receipt Transaction',
    category: merchant ? inferCategory(merchant) : 'Lainnya',
    date,
  }
}

/**
 * Parse receipt with detailed result (for debugging and advanced features)
 */
export function parseReceiptTextDetailed(text: string): ReceiptParseResult {
  const normalizedText = normalizeOcrText(text)
  const numbers = extractNumbers(normalizedText)

  // Detect total
  const totalResult = detectTotal(normalizedText, numbers)
  const detectedAmount = totalResult?.amount || 0
  const confidenceLevel = totalResult?.confidence || 'low'
  const sourceKeyword = totalResult?.keyword

  // Extract metadata
  const items = detectItems(normalizedText, numbers)
  const extractedDate = extractDate(normalizedText)
  const date = isDateInFuture(extractedDate) ? getTodayDateString() : extractedDate
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
