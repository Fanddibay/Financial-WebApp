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
 * - Fix common OCR errors (O->0, I/l->1, S->5 in numbers, B->8, etc.)
 * - Works for both receipts (struk) and invoices (faktur)
 */
function normalizeOcrText(text: string): string {
  return text
    .replace(/\s+/g, ' ') // Multiple spaces to single space
    // Fix common OCR errors in number contexts (receipt & invoice)
    .replace(/(\d)\s*[Oo]\s*(\d)/g, '$10$2') // O between numbers -> 0
    .replace(/(\d)\s*[Il|]\s*(\d)/g, '$11$2') // I or l between numbers -> 1
    .replace(/\b[Oo]\s*(\d)/g, '0$1') // O at start of number -> 0
    .replace(/(\d)\s*[Oo]\b/g, '$10') // O at end of number -> 0
    .replace(/([Rp\s])([S5])(\d{2,})/gi, '$15$3') // S misread as 5 after Rp
    .replace(/(\d)[B8](\d)/g, '$18$2') // B in number -> 8
    .replace(/(\d)\s*[Zz]\s*(\d)/g, '$12$2') // Z in number -> 2
    // Preserve common receipt/invoice symbols
    .replace(/[^\w\s\d.,:/-]/g, '') // Remove special symbols except common ones
    .trim()
}

/**
 * Parse amount string for Indonesian Rupiah (IDR) and common receipt formats.
 * - IDR format: dot = thousands separator, comma = decimal (e.g. 238.921,00 → 238921)
 * - Dot-only: 44.100, 1.000.000 → 44100, 1000000
 * - Comma-only (thousands): 75,400 → 75400
 * - US style: 295,392.00 (comma thousands, dot decimal) → 295392
 */
function parseIDRAmount(numStr: string): number {
  const raw = numStr.trim().replace(/\s/g, '')
  if (!raw || !/\d/.test(raw)) return NaN

  // Indonesian: digits with . as thousands and ,XX (1-2 decimal digits) at end → e.g. 238.921,00
  const idrDecimalMatch = raw.match(/^(\d{1,3}(?:\.\d{3})*),(\d{1,2})$/)
  if (idrDecimalMatch) {
    const intPart = idrDecimalMatch[1].replace(/\./g, '')
    const decPart = idrDecimalMatch[2].padEnd(2, '0').slice(0, 2)
    return parseInt(intPart, 10) + parseInt(decPart, 10) / 100
  }

  // Indonesian: only dots as thousands (no comma), e.g. 44.100, Rp38.000, 1.002.500
  if (/^\d{1,3}(?:\.\d{3})*(?:\.\d{1,2})?$/.test(raw)) {
    const normalized = raw.replace(/\.(?=\d{3})/g, '').replace(/\.(\d{1,2})$/, ',$1')
    const parts = normalized.split(',')
    if (parts.length === 2) {
      return parseInt(parts[0].replace(/\D/g, ''), 10) + parseInt(parts[1].padEnd(2, '0').slice(0, 2), 10) / 100
    }
    return parseInt(raw.replace(/\./g, ''), 10)
  }

  // US/international: comma = thousands, dot = decimal, e.g. 295,392.00
  if (/^\d{1,3}(?:,\d{3})*(?:\.\d+)?$/.test(raw)) {
    return parseFloat(raw.replace(/,/g, ''))
  }

  // Comma-only thousands (no decimal), e.g. 75,400 or 77,400
  if (/^\d{1,3}(?:,\d{3})+$/.test(raw)) {
    return parseInt(raw.replace(/,/g, ''), 10)
  }

  // Fallback: remove spaces and commas, then treat remaining dot as decimal only if followed by 1-2 digits at end
  const noSpace = raw.replace(/\s/g, '')
  const fallbackDecimal = noSpace.match(/^([\d.]+),(\d{1,2})$/)
  if (fallbackDecimal) {
    const intPart = fallbackDecimal[1].replace(/\./g, '')
    const decPart = fallbackDecimal[2].padEnd(2, '0').slice(0, 2)
    return parseInt(intPart, 10) + parseInt(decPart, 10) / 100
  }
  const digitsOnly = noSpace.replace(/[^\d]/g, '')
  return digitsOnly ? parseInt(digitsOnly, 10) : NaN
}

/**
 * Normalize number string to pure digits (legacy helper; prefer parseIDRAmount for amounts)
 * Handles: 58,000, 58.000, 58 000 → 58000
 */
function normalizeNumber(numStr: string): string {
  return numStr
    .replace(/[,\s]/g, '')
    .replace(/\.(?=\d{3})/g, '')
    .replace(/[^\d]/g, '')
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

/** Check if line looks like a date/time line (so we don't treat year as amount) */
function isDateLikeLine(line: string): boolean {
  const lower = line.toLowerCase()
  const dateLike = [
    /\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/, // 18.7.2024, 21.01.22, 05/01/2026
    /\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}/,      // 2023-08-02
    /\d{1,2}\s+(jan|feb|mar|apr|mei|jun|jul|agu|sep|okt|nov|des)/i,
    /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2},?\s+\d{4}/i,
    /\d{4}\s+(jan|feb|mar|apr|mei|jun|jul|agu|sep|okt|nov|des)/i,
    /\b(wib|wita|wit)\b/,
    /\b(due\s*on|tanggal|tgl|date|time|jam)\b/,
    /\d{1,2}:\d{2}(:\d{2})?/,              // 08:49, 13:54:33
  ]
  return dateLike.some((p) => p.test(lower))
}

/** Skip 4-digit number that is likely a year (e.g. 2024, 2026) in date context */
function isLikelyYear(value: number, line: string): boolean {
  if (value < 2010 || value > 2035) return false
  if (!Number.isInteger(value)) return false
  const str = String(value)
  if (str.length !== 4) return false
  return isDateLikeLine(line)
}

function extractNumbers(text: string): NumberMatch[] {
  const lines = text.split('\n')
  const numbers: NumberMatch[] = []

  lines.forEach((line, lineIndex) => {
    const numberPatterns = [
      /(?:Rp\.?\s*|IDR\.?\s*|Rupiah\s*)?(\d{1,3}(?:[.,\s]\d{3})*(?:[.,]\d{2})?)/gi,
      /(?:total|amount|nominal|jumlah|bayar|tagihan|payment\s*amount)\s*:?\s*(\d{1,3}(?:[.,\s]\d{3})*(?:[.,]\d{2})?)/gi,
      /(\d{1,3}(?:[.,\s]\d{3})*(?:[.,]\d{2})?)\s*(?:\.|,|$)/g,
      /(\d{3,}(?:[.,]\d{2})?)/g,
      /(\d+[.,]\d{3,})/g,
    ]

    numberPatterns.forEach((pattern) => {
      const matches = Array.from(line.matchAll(pattern))
      matches.forEach((match) => {
        if (match.index === undefined) return
        const beforeMatch = line.substring(Math.max(0, match.index - 8), match.index)
        const afterMatch = line.substring(match.index + match[0].length, match.index + match[0].length + 8)
        const context = (beforeMatch + match[0] + afterMatch).toLowerCase()

        if (/\d{1,2}[\/\-:]\d{1,2}/.test(context)) return

        const rawNum = match[1] || ''
        const value = parseIDRAmount(rawNum)

        if (!Number.isFinite(value) || value < 100 || value > 1000000000) return
        if (isLikelyYear(value, line)) return

        const isDuplicate = numbers.some(
          (n) => n.lineIndex === lineIndex &&
                 Math.abs(n.position - match.index) < 10 &&
                 Math.abs(n.value - value) < 100
        )
        if (!isDuplicate) {
          numbers.push({
            value: Math.round(value),
            original: match[0],
            line: line.trim(),
            lineIndex,
            position: match.index,
          })
        }
      })
    })
  })

  return numbers.sort((a, b) => {
    if (a.lineIndex !== b.lineIndex) return a.lineIndex - b.lineIndex
    return a.position - b.position
  })
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

  // ✅ Target amount (total akhir) — receipt & invoice; prioritize explicit total labels
  const targetPatterns = [
    /\b(payment\s*amount|total\s*transaksi|nominal\s*transfer|total\s*pesanan|total\s*pembayaran)\b/i,
    /\b(total\s*bayar|total\s*tagihan|jumlah\s*bayar|yang\s*harus\s*dibayar|balance\s*due|amount\s*due)\b/i,
    /\b(grand\s*total|total\s*amount|invoice\s*total|total\s*pembelian|diterima)\b/i,
    /\b(total|jumlah|bayar|pembayaran|nominal|tagihan|faktur|invoice)\b/i,
    /\b(terbilang|nominal\s*pembayaran|nilai\s*pembayaran)\b/i,
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

/** Total-keyword patterns for Tier 1 (order = priority for same-line) */
const TOTAL_KEYWORDS = [
  { pattern: /\b(payment\s*amount|total\s*transaksi|nominal\s*transfer)\b/i, weight: 1.0 },
  { pattern: /\b(total\s*pesanan|total\s*pembayaran|amount\s*due|total\s*bayar)\b/i, weight: 1.0 },
  { pattern: /\b(grand\s*total|total\s*tagihan|total\s*amount|balance\s*due)\b/i, weight: 0.98 },
  { pattern: /\b(jumlah|jumlah\s*bayar|total\s*:?\s*$)\b/i, weight: 0.97 },
  { pattern: /\b(total)\b/i, weight: 0.9 },
  { pattern: /\b(bayar|nominal|tagihan|pembayaran|diterima)\b/i, weight: 0.85 },
]

/**
 * Tier 1: Prefer nominal that is ON THE SAME LINE as a total keyword (OCR often has "Total Rp 38.000" on one line).
 * Pick number that appears after the keyword (right side) when possible.
 */
function detectTotalTier1(text: string, numbers: NumberMatch[]): {
  amount: number
  confidence: 'high' | 'medium' | 'low'
  keyword?: string
} | null {
  const lines = text.split('\n')
  const minAmount = 100

  // --- Pass 1: Same-line only (strongest signal: keyword and amount on same line) ---
  let bestSameLine: {
    amount: number
    confidence: 'high' | 'medium' | 'low'
    keyword: string
    weight: number
    distance: number
  } | null = null

  lines.forEach((line, lineIndex) => {
    const lowerLine = line.toLowerCase()
    const lineNumbers = numbers.filter((n) => n.lineIndex === lineIndex && n.value >= minAmount)
    if (lineNumbers.length === 0) return

    for (const { pattern, weight } of TOTAL_KEYWORDS) {
      const keywordMatch = lowerLine.match(pattern)
      if (!keywordMatch || keywordMatch.index === undefined) continue

      const kwStart = keywordMatch.index
      const kwEnd = kwStart + keywordMatch[0].length

      // Prefer number that appears AFTER the keyword (right side of receipt = total)
      const afterKeyword = lineNumbers.filter((n) => n.position >= kwEnd)
      const candidates = afterKeyword.length > 0 ? afterKeyword : lineNumbers
      const chosen = candidates.reduce((best, n) => {
        const dist = Math.abs(n.position - kwEnd)
        if (!best) return { num: n, dist }
        return dist < best.dist ? { num: n, dist } : best
      }, null as { num: NumberMatch, dist: number } | null)

      if (!chosen) continue

      const confidence: 'high' | 'medium' | 'low' = weight >= 0.97 ? 'high' : weight >= 0.9 ? 'medium' : 'low'
      const distance = chosen.dist + (chosen.num.position >= kwEnd ? 0 : 1000)

      if (!bestSameLine || weight > bestSameLine.weight || (weight === bestSameLine.weight && distance < bestSameLine.distance)) {
        bestSameLine = {
          amount: chosen.num.value,
          confidence,
          keyword: keywordMatch[0],
          weight,
          distance,
        }
      }
    }
  })

  if (bestSameLine) {
    return {
      amount: bestSameLine.amount,
      confidence: bestSameLine.confidence,
      keyword: bestSameLine.keyword,
    }
  }

  // --- Pass 2: Nearby lines (within 1 line), prefer number closest to keyword ---
  let bestNearby: { amount: number; confidence: 'high' | 'medium' | 'low'; keyword: string; distance: number } | null = null

  lines.forEach((line, lineIndex) => {
    const lowerLine = line.toLowerCase()
    for (const { pattern, weight } of TOTAL_KEYWORDS) {
      const keywordMatch = lowerLine.match(pattern)
      if (!keywordMatch || keywordMatch.index === undefined) continue

      const nearbyNumbers = numbers.filter(
        (n) => n.lineIndex >= lineIndex - 1 && n.lineIndex <= lineIndex + 1 && n.value >= minAmount
      )
      for (const num of nearbyNumbers) {
        const lineDist = Math.abs(num.lineIndex - lineIndex)
        const charDist = Math.abs(num.position - keywordMatch.index)
        const distance = lineDist * 200 + charDist
        const confidence: 'high' | 'medium' | 'low' = weight >= 0.97 ? 'high' : weight >= 0.9 ? 'medium' : 'low'
        if (!bestNearby || distance < bestNearby.distance) {
          bestNearby = { amount: num.value, confidence, keyword: keywordMatch[0], distance }
        }
      }
    }
  })

  if (bestNearby) {
    return { amount: bestNearby.amount, confidence: bestNearby.confidence, keyword: bestNearby.keyword }
  }

  return null
}

/**
 * Check if line contains any total-like keyword (for Tier 2 fallback)
 */
function lineHasTotalKeyword(line: string): boolean {
  return TOTAL_KEYWORDS.some(({ pattern }) => pattern.test(line.toLowerCase()))
}

/**
 * Tier 2: Fallback when no keyword match. Prefer numbers on lines that contain total keywords.
 * Only then fall back to "largest in bottom half" so we don't pick subtotal/item price.
 */
function detectTotalTier2(numbers: NumberMatch[], threshold: number = 500): {
  amount: number
  confidence: 'low'
} | null {
  const validNumbers = numbers.filter((n) => {
    const category = classifyNumber(n, n.line, numbers)
    return category !== 'non-price' && n.value >= threshold && n.value <= 1000000000
  })
  if (validNumbers.length === 0) return null

  // Prefer numbers whose line contains a total keyword (OCR printed "Total" / "Payment amount" etc.)
  const onTotalLine = validNumbers.filter((n) => lineHasTotalKeyword(n.line))
  if (onTotalLine.length > 0) {
    const byLineDesc = onTotalLine.sort((a, b) => b.lineIndex - a.lineIndex)
    const lastLineIndex = byLineDesc[0].lineIndex
    const onLastTotalLine = byLineDesc.filter((n) => n.lineIndex === lastLineIndex)
    const pick = onLastTotalLine.reduce((a, b) => (a.value >= b.value ? a : b))
    return { amount: pick.value, confidence: 'low' }
  }

  // No total-keyword line: take largest from bottom half of receipt (totals usually at bottom)
  const sorted = [...validNumbers].sort((a, b) => {
    if (a.lineIndex !== b.lineIndex) return b.lineIndex - a.lineIndex
    return b.value - a.value
  })
  const bottomHalf = sorted.slice(0, Math.max(1, Math.floor(sorted.length / 2)))
  const largest = bottomHalf.reduce((prev, cur) => (cur.value > prev.value ? cur : prev))
  return { amount: largest.value, confidence: 'low' }
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
          const quantity = qtyMatch ? parseInt(qtyMatch[1] || '1', 10) : 1

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
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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

const MONTH_NAMES_ID = ['januari', 'februari', 'maret', 'april', 'mei', 'juni', 'juli', 'agustus', 'september', 'oktober', 'november', 'desember']
const MONTH_NAMES_EN = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']

/**
 * Extract date from receipt or invoice text
 * Supports: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, "Tanggal: ...", "Date: ...", "5 Feb 2026", "05 Februari 2026"
 * Returns today's date if extraction fails or date is in the future
 */
function extractDate(text: string): string {
  const lines = text.split('\n')
  const fullText = text

  // Try "Tanggal: DD/MM/YYYY" or "Date: YYYY-MM-DD" etc. first
  const labelPatterns = [
    /(?:tanggal|tgl|date|issued?)\s*:?\s*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/i,
    /(?:tanggal|tgl|date|issued?)\s*:?\s*(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/i,
    /(?:tanggal|tgl|date)\s*:?\s*(\d{1,2})\s+(jan|feb|mar|apr|mei|jun|jul|agu|sep|okt|nov|des)[a-z]*\s+(\d{2,4})/i,
  ]
  for (let pi = 0; pi < labelPatterns.length; pi++) {
    const pattern = labelPatterns[pi]
    const match = fullText.match(pattern)
    if (!match) continue
    const m1 = match[1] ?? ''
    const m2 = match[2] ?? ''
    const m3 = match[3] ?? ''
    let day: string, month: string, year: string
    const isMonthNamePattern = pi === 2
    if (isMonthNamePattern) {
      const m2Lower = m2.toLowerCase()
      let monthIndex = MONTH_NAMES_ID.findIndex((m) => m.startsWith(m2Lower))
      if (monthIndex < 0) monthIndex = MONTH_NAMES_EN.findIndex((m) => m.startsWith(m2Lower))
      if (monthIndex < 0) continue
      day = m1.padStart(2, '0')
      month = String(monthIndex + 1).padStart(2, '0')
      year = m3.length === 2 ? '20' + m3 : m3
    } else if (m1.length === 4) {
      year = m1
      month = m2.padStart(2, '0')
      day = m3.padStart(2, '0')
    } else {
      day = m1.padStart(2, '0')
      month = m2.padStart(2, '0')
      year = m3.length === 2 ? '20' + m3 : m3
    }
    const dateStr = `${year}-${month}-${day}`
    const dateObj = new Date(dateStr)
    if (!isNaN(dateObj.getTime()) && dateObj.getFullYear() >= 2020 && dateObj.getFullYear() <= 2100) {
      if (isDateInFuture(dateStr)) return getTodayDateString()
      return dateStr
    }
  }

  // Standalone date with month name (no label): "5 Feb 2026", "Feb 8, 2026", "05 Jan 2026"
  const monthNamePatterns = [
    /(\d{1,2})\s+(jan|feb|mar|apr|mei|jun|jul|agu|sep|okt|nov|des)[a-z]*\s+(\d{2,4})/i,
    /(jan|feb|mar|apr|mei|jun|jul|agu|sep|okt|nov|des)[a-z]*\s+(\d{1,2}),?\s+(\d{4})/i,
    /(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{2,4})/i,
    /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})/i,
  ]
  for (let pi = 0; pi < monthNamePatterns.length; pi++) {
    const match = fullText.match(monthNamePatterns[pi])
    if (!match) continue
    const m1 = match[1] ?? ''
    const m2 = match[2] ?? ''
    const m3 = match[3] ?? ''
    const m2Lower = m2.toLowerCase()
    let monthIndex = MONTH_NAMES_ID.findIndex((m) => m.startsWith(m2Lower))
    if (monthIndex < 0) monthIndex = MONTH_NAMES_EN.findIndex((m) => m.startsWith(m2Lower))
    if (monthIndex < 0) continue
    let day: string, month: string, year: string
    if (pi === 1 || pi === 3) {
      day = m2.padStart(2, '0')
      month = String(monthIndex + 1).padStart(2, '0')
      year = m3
    } else {
      day = m1.padStart(2, '0')
      month = String(monthIndex + 1).padStart(2, '0')
      year = m3.length === 2 ? '20' + m3 : m3
    }
    const dateStr = `${year}-${month}-${day}`
    const dateObj = new Date(dateStr)
    if (!isNaN(dateObj.getTime()) && dateObj.getFullYear() >= 2020 && dateObj.getFullYear() <= 2100) {
      if (isDateInFuture(dateStr)) return getTodayDateString()
      return dateStr
    }
  }

  const datePatterns = [
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/,
    /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/,
  ]
  for (const pattern of datePatterns) {
    const match = fullText.match(pattern)
    if (match) {
      let day: string, month: string, year: string
      const m1 = match[1] ?? ''
      const m2 = match[2] ?? ''
      const m3 = match[3] ?? ''
      if (m1.length === 4) {
        year = m1
        month = m2.padStart(2, '0')
        day = m3.padStart(2, '0')
      } else {
        day = m1.padStart(2, '0')
        month = m2.padStart(2, '0')
        year = m3.length === 2 ? '20' + m3 : m3
      }
      const dateStr = `${year}-${month}-${day}`
      const dateObj = new Date(dateStr)
      if (!isNaN(dateObj.getTime()) && dateObj.getFullYear() >= 2020 && dateObj.getFullYear() <= 2100) {
        if (isDateInFuture(dateStr)) return getTodayDateString()
        return dateStr
      }
    }
  }
  return getTodayDateString()
}

/**
 * Extract merchant/store name from receipt or invoice
 * Handles: platform names, "From:", "Bill From", "Issued by", all-caps vendor lines
 */
function extractMerchant(text: string): string | undefined {
  const lines = text.split('\n')
  const firstLines = lines.slice(0, 15)

  for (const line of firstLines) {
    const trimmed = line.trim()

    // Invoice-style: "From:", "Bill From", "Issued by", "Vendor:"
    const fromMatch = trimmed.match(/(?:from|bill\s*from|issued\s*by|vendor|dari|penerbit)\s*:?\s*(.+)/i)
    if (fromMatch && fromMatch[1]) {
      const name = fromMatch[1].trim()
      if (name.length >= 2 && name.length <= 50 && !/^\d+$/.test(name)) {
        return name
      }
    }

    // Platform detection (highest priority when matched)
    const platforms = [
      { name: 'Shopee', pattern: /shopee/i },
      { name: 'Tokopedia', pattern: /tokopedia|toped/i },
      { name: 'GrabFood', pattern: /grabfood|grab/i },
      { name: 'GoFood', pattern: /gofood|gojek|gopay/i },
      { name: 'BCA', pattern: /bca|bank\s*central\s*asia/i },
      { name: 'Mandiri', pattern: /mandiri/i },
      { name: 'BNI', pattern: /bni/i },
      { name: 'BRI', pattern: /bri/i },
      { name: 'Indomaret', pattern: /indomaret|indomarco/i },
      { name: 'Alfamart', pattern: /alfamart|sumber\s*alfaria/i },
      { name: 'Lazada', pattern: /lazada/i },
      { name: 'TikTok Shop', pattern: /tiktok\s*shop|tiktok shop/i },
    ]

    for (const platform of platforms) {
      if (platform.pattern.test(trimmed)) {
        if (platform.name === 'Shopee') {
          if (/shopeepay/i.test(trimmed)) return 'ShopeePay'
          return 'Shopee'
        }
        return platform.name
      }
    }

    // Likely merchant name: all caps or title case, reasonable length, not a keyword line
    if (
      trimmed.length >= 3 &&
      trimmed.length <= 50 &&
      /^[A-Za-z0-9\s&.\-]+$/.test(trimmed) &&
      !/^TOTAL|RECEIPT|INVOICE|DATE|TIME|NOMINAL|TRANSFER|BAYAR|TANGGAL|TGL\b|NO\.|NUMBER/i.test(trimmed)
    ) {
      if (/^[A-Z\s&]+$/.test(trimmed)) return trimmed
      if (trimmed.length >= 4 && !/^\d/.test(trimmed)) return trimmed
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
    // Tier 2: Special Handling for Shopee/Clean Layouts where "Total Pesanan" might not be matched properly
    // or when there are multiple matching amounts
    const tier2Result = detectTotalTier2(numbers, 1000)
    if (tier2Result) {
      detectedAmount = tier2Result.amount
      confidenceLevel = tier2Result.confidence
    }
  }

  // Silence unused variable warnings
  void confidenceLevel
  void sourceKeyword

  // A4: Extract metadata first
  const date = extractDate(normalizedText)
  const merchant = extractMerchant(normalizedText)
  const isBank = merchant && ['BCA', 'Mandiri', 'BNI', 'BRI'].includes(merchant)

  // A5: Infer transaction type (Income vs Expense)
  let type: 'income' | 'expense' = 'expense'
  const incomeIndicators = [
    /transfer\s*berhasil/i,
    /jumlah\s*masuk/i,
    /diterima\s*dari/i,
    /credit\b/i,
    /nominal\s*transfer/i // In many bank apps, this is the main amount
  ]

  // If it's a bank receipt and contains income indicators, mark as income
  if (isBank) {
    if (incomeIndicators.some(pattern => pattern.test(normalizedText))) {
      type = 'income'
    }
  }

  // Special case for screenshots with "Transfer Berhasil" at the top (Mandiri/Livin)
  if (/transfer\s*berhasil/i.test(normalizedText) && /rekening\s*sumber/i.test(normalizedText)) {
    type = 'income'
  }

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
    type,
    amount: detectedAmount,
    description: merchant ? `${merchant} Transaction` : 'Receipt Transaction',
    category: merchant ? inferCategory(merchant) : 'Lainnya',
    date,
  }

  // Refine description for specific platforms
  if (merchant === 'Shopee' || merchant === 'ShopeePay') {
    result.description = 'Belanja Shopee'
    result.category = 'Belanja'
  } else if (isBank && type === 'income') {
    result.description = merchant ? `Transfer Masuk ${merchant}` : 'Transfer Masuk'
    // Default to 'Gaji' for income if no specific category inferred
    if (!result.category || result.category === 'Lainnya' || result.category === 'Transfer') {
      result.category = 'Gaji'
    }
  }

  // User requirement: If category is 'Lainnya' and no specific merchant, clear description
  if (result.category === 'Lainnya' && !merchant) {
    result.description = ''
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
    Tagihan: ['utility', 'listrik', 'air', 'internet', 'phone', 'telepon', 'cable', 'bill', 'tagihan', 'topup', 'pulsa'],
    Hiburan: ['movie', 'cinema', 'bioskop', 'theater', 'game', 'entertainment', 'netflix', 'spotify', 'youtube'],
    Kesehatan: ['pharmacy', 'apotek', 'drug', 'obat', 'hospital', 'rumah sakit', 'clinic', 'klinik', 'doctor', 'dokter', 'halodoc'],
    'E-commerce': ['shopee', 'tokopedia', 'lazada', 'blibli', 'bukalapak', 'tiktok\s*shop'],
    Transfer: ['transfer', 'bca', 'mandiri', 'bni', 'bri', 'm-banking', 'payment', 'va', 'virtual\s*account'],
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
