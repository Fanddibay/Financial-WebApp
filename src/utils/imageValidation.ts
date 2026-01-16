/**
 * Image validation utilities for receipt scanning
 * Validates image quality and receipt patterns before OCR processing
 */

export interface ImageValidationResult {
  isValid: boolean
  errorType?: 'blur' | 'low-light' | 'no-text' | 'not-receipt' | 'too-small' | 'unknown'
  errorMessage?: string
  confidence?: number
}

/**
 * Detect image blur using Laplacian variance (optimized with sampling)
 * Higher variance = sharper image
 */
export async function detectBlur(imageSrc: string): Promise<{ isBlurred: boolean; variance: number }> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve({ isBlurred: true, variance: 0 })
        return
      }

      // Scale down for performance (max 400px on longest side)
      const maxSize = 400
      let width = img.width
      let height = img.height
      if (width > maxSize || height > maxSize) {
        const scale = maxSize / Math.max(width, height)
        width = Math.floor(width * scale)
        height = Math.floor(height * scale)
      }

      canvas.width = width
      canvas.height = height
      ctx.drawImage(img, 0, 0, width, height)

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data
      let variance = 0
      let mean = 0
      const laplacian: number[] = []

      // Sample every 3rd pixel for performance
      const step = 3
      for (let y = 1; y < canvas.height - 1; y += step) {
        for (let x = 1; x < canvas.width - 1; x += step) {
          const idx = (y * canvas.width + x) * 4
          const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3

          const rightIdx = (y * canvas.width + Math.min(x + 1, canvas.width - 1)) * 4
          const rightGray = (data[rightIdx] + data[rightIdx + 1] + data[rightIdx + 2]) / 3

          const bottomIdx = (Math.min(y + 1, canvas.height - 1) * canvas.width + x) * 4
          const bottomGray = (data[bottomIdx] + data[bottomIdx + 1] + data[bottomIdx + 2]) / 3

          const laplacianValue = Math.abs(gray - rightGray) + Math.abs(gray - bottomGray)
          laplacian.push(laplacianValue)
          mean += laplacianValue
        }
      }

      if (laplacian.length === 0) {
        resolve({ isBlurred: true, variance: 0 })
        return
      }

      mean /= laplacian.length

      // Calculate variance
      for (const value of laplacian) {
        variance += Math.pow(value - mean, 2)
      }
      variance /= laplacian.length

      // Threshold: variance < 50 is considered blurred (more lenient for better success rate)
      const isBlurred = variance < 50

      resolve({ isBlurred, variance })
    }
    img.onerror = () => resolve({ isBlurred: true, variance: 0 })
    img.src = imageSrc
  })
}

/**
 * Detect low lighting by checking average brightness
 */
export async function detectLowLight(imageSrc: string): Promise<{ isLowLight: boolean; brightness: number }> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve({ isLowLight: true, brightness: 0 })
        return
      }

      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data
      let totalBrightness = 0
      let pixelCount = 0

      // Sample pixels (every 10th pixel for performance)
      for (let i = 0; i < data.length; i += 40) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        const brightness = (r + g + b) / 3
        totalBrightness += brightness
        pixelCount++
      }

      const avgBrightness = totalBrightness / pixelCount
      // Threshold: brightness < 50 is considered low light (more lenient, 0-255 scale)
      const isLowLight = avgBrightness < 50

      resolve({ isLowLight, brightness: avgBrightness })
    }
    img.onerror = () => resolve({ isLowLight: true, brightness: 0 })
    img.src = imageSrc
  })
}

/**
 * Check if image is too small for OCR
 */
export async function checkImageSize(imageSrc: string): Promise<{ isTooSmall: boolean; width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      // Minimum recommended size for OCR: 300x300 pixels
      const minSize = 300
      const isTooSmall = img.width < minSize || img.height < minSize
      resolve({ isTooSmall, width: img.width, height: img.height })
    }
    img.onerror = () => resolve({ isTooSmall: true, width: 0, height: 0 })
    img.src = imageSrc
  })
}

/**
 * Validate if OCR text contains receipt-like patterns
 */
export function validateReceiptPattern(text: string): {
  isValid: boolean
  confidence: number
  hasPriceFormat: boolean
  hasFinancialKeywords: boolean
  hasEnoughText: boolean
  hasNumbers: boolean
} {
  const normalizedText = text.toLowerCase().trim()

  // Check for price formats (Rp, IDR, numbers with currency symbols)
  const pricePatterns = [
    /rp\s*\d/i,
    /idr\s*\d/i,
    /\d+[.,]\d{3}/, // Indonesian number format: 1.000 or 1,000
    /\d+[.,]\d{3}[.,]\d{3}/, // Larger numbers: 1.000.000
    /\d{3,}/, // Any number with 3+ digits (likely a price)
    /\d+\.\d{2}/, // Decimal prices
    /total/i,
    /jumlah/i,
    /bayar/i,
  ]
  const hasPriceFormat = pricePatterns.some((pattern) => pattern.test(normalizedText))

  // Check for financial keywords (expanded list)
  const financialKeywords = [
    'total',
    'jumlah',
    'bayar',
    'pembayaran',
    'subtotal',
    'sub total',
    'sebelum pajak',
    'pajak',
    'ppn',
    'pph',
    'tax',
    'vat',
    'diskon',
    'discount',
    'potongan',
    'promo',
    'kembalian',
    'change',
    'tunai',
    'cash',
    'receipt',
    'struk',
    'nota',
    'invoice',
    'kwitansi',
    'tanggal',
    'date',
    'waktu',
    'time',
    'kasir',
    'cashier',
    'teller',
    'harga',
    'price',
    'biaya',
    'cost',
  ]
  const hasFinancialKeywords = financialKeywords.some((keyword) => normalizedText.includes(keyword))

  // Check for presence of any numbers
  const hasNumbers = /\d/.test(normalizedText)

  // Check for minimum text length (receipts should have some text) - more lenient
  const hasEnoughText = normalizedText.length > 10

  // Calculate confidence score
  let confidence = 0
  if (hasPriceFormat) confidence += 35
  if (hasFinancialKeywords) confidence += 35
  if (hasEnoughText) confidence += 15
  if (hasNumbers) confidence += 15 // Added for numbers presence

  // More lenient validation - only require 40% confidence and presence of numbers
  const isValid = confidence >= 40 && hasEnoughText && hasNumbers

  return {
    isValid,
    confidence,
    hasPriceFormat,
    hasFinancialKeywords,
    hasEnoughText,
    hasNumbers, // Export for more flexible validation
  }
}

/**
 * Comprehensive image validation before OCR
 */
export async function validateImageForReceipt(
  imageSrc: string,
  ocrText?: string
): Promise<ImageValidationResult> {
  // Check image size
  const sizeCheck = await checkImageSize(imageSrc)
  if (sizeCheck.isTooSmall) {
    return {
      isValid: false,
      errorType: 'too-small',
      errorMessage: 'Gambar terlalu kecil. Pastikan gambar memiliki resolusi minimal 300x300 piksel.',
    }
  }

  // Check for blur
  const blurCheck = await detectBlur(imageSrc)
  if (blurCheck.isBlurred) {
    return {
      isValid: false,
      errorType: 'blur',
      errorMessage:
        'Gambar terlihat buram. Pastikan foto jelas dan fokus pada struk. Coba ambil foto ulang dengan pencahayaan yang lebih baik.',
      confidence: blurCheck.variance,
    }
  }

  // Check for low light
  const lightCheck = await detectLowLight(imageSrc)
  if (lightCheck.isLowLight) {
    return {
      isValid: false,
      errorType: 'low-light',
      errorMessage:
        'Gambar terlalu gelap. Pastikan pencahayaan cukup dan struk terlihat jelas. Coba ambil foto di tempat yang lebih terang.',
      confidence: lightCheck.brightness,
    }
  }

  // If OCR text is provided, validate receipt patterns (more lenient)
  if (ocrText !== undefined) {
    const patternCheck = validateReceiptPattern(ocrText)

    // Only fail if no numbers found at all (very strict)
    if (!patternCheck.isValid && !patternCheck.hasNumbers) {
      let errorMessage = 'Tidak dapat mendeteksi informasi struk dari gambar ini. '
      if (!patternCheck.hasEnoughText) {
        errorMessage += 'Gambar mungkin tidak mengandung teks yang cukup atau teks tidak terbaca dengan jelas.'
      } else if (!patternCheck.hasPriceFormat && !patternCheck.hasFinancialKeywords) {
        errorMessage += 'Gambar tidak terlihat seperti struk pembayaran. Pastikan gambar adalah struk yang valid.'
      } else {
        errorMessage += 'Format struk tidak dikenali. Pastikan struk memiliki informasi total pembayaran yang jelas.'
      }

      return {
        isValid: false,
        errorType: 'not-receipt',
        errorMessage,
        confidence: patternCheck.confidence,
      }
    }

    // Only fail if text is extremely short (very strict)
    if (ocrText.trim().length < 5) {
      return {
        isValid: false,
        errorType: 'no-text',
        errorMessage:
          'Tidak dapat membaca teks dari gambar. Pastikan teks pada struk jelas dan tidak terpotong. Coba ambil foto ulang dengan fokus yang lebih baik.',
      }
    }
  }

  return {
    isValid: true,
  }
}

