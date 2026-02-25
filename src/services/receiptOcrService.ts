/**
 * Receipt OCR for Split Bill: run Tesseract on image and parse into line items.
 * Reuses same Tesseract + receiptParser as ReceiptScanner.
 */
import { parseReceiptTextDetailed, type ReceiptParseResult, type ReceiptItem } from '@/utils/receiptParser'
import { validateImageForReceipt } from '@/utils/imageValidation'
import { quickPreprocessImageForOCR } from '@/utils/imagePreprocessing'

type OcrWorker = {
  setParameters: (p: Record<string, unknown>) => Promise<void>
  recognize: (f: File) => Promise<{ data: { text: string; confidence: number } }>
  terminate: () => Promise<void>
}

type TesseractModule = {
  createWorker: (lang: string, oem: number, options: Record<string, unknown>) => Promise<OcrWorker>
}

let Tesseract: TesseractModule | null = null
let tesseractLoadPromise: Promise<TesseractModule> | null = null

export async function loadTesseract(): Promise<TesseractModule> {
  if (Tesseract) return Tesseract
  if (tesseractLoadPromise) return tesseractLoadPromise
  tesseractLoadPromise = (async () => {
    const tesseractModule = await import('tesseract.js')
    Tesseract = tesseractModule.default || tesseractModule
    if (!Tesseract) throw new Error('Tesseract.js module not found')
    return Tesseract
  })()
  return tesseractLoadPromise
}

export interface ReceiptOcrResult {
  text: string
  confidence: number
  parseResult: ReceiptParseResult
  /** Line items for split: name, qty, unit_price. price in parser = line total. */
  items: Array<{ name: string; qty: number; unit_price: number }>
}

/**
 * Run OCR on receipt image and extract line items for split bill.
 * Returns items with name, qty (default 1), unit_price (derived from line total).
 */
export async function extractReceiptItems(imageFile: File): Promise<ReceiptOcrResult> {
  const TesseractInstance = await loadTesseract()

  const imageSrc = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target?.result as string)
    reader.onerror = reject
    reader.readAsDataURL(imageFile)
  })

  const preValidation = await validateImageForReceipt(imageSrc)
  if (preValidation.errorType === 'too-small') {
    throw new Error(preValidation.errorMessage ?? 'Image too small for scanning')
  }

  let processedFile: File
  try {
    processedFile = await quickPreprocessImageForOCR(imageFile)
  } catch {
    processedFile = imageFile
  }

  const createWorkerWithTimeout = async (options: Record<string, unknown>, timeoutMs = 60000, lang = 'eng'): Promise<OcrWorker> => {
    return Promise.race([
      TesseractInstance.createWorker(lang, 1, options),
      new Promise<OcrWorker>((_, reject) => setTimeout(() => reject(new Error('OCR timeout')), timeoutMs)),
    ])
  }

  const workerOptions = {
    workerPath: '/tesseract/worker.min.js',
    corePath: '/tesseract/tesseract-core.wasm.js',
    langPath: '/tesseract/lang-data',
  }

  let worker: OcrWorker
  try {
    worker = await createWorkerWithTimeout(workerOptions, 60000, 'eng+ind')
  } catch {
    try {
      worker = await createWorkerWithTimeout(workerOptions, 60000, 'eng')
    } catch {
      const cdnOptions = {
        workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js',
        corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core.wasm.js',
        langPath: 'https://cdn.jsdelivr.net/npm/tesseract.js-data@5',
      }
      worker = await createWorkerWithTimeout(cdnOptions, 60000, 'eng') as typeof worker
    }
  }

  await worker.setParameters({
    tessedit_pageseg_mode: '6',
    tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,:/- ',
  })

  const { data: { text, confidence } } = await worker.recognize(processedFile)
  await worker.terminate()

  const postValidation = await validateImageForReceipt(imageSrc, text)
  if (!postValidation.isValid && text.trim().length < 10) {
    throw new Error('Could not read text from image. Try a clearer photo.')
  }

  const parseResult = parseReceiptTextDetailed(text)

  const items: Array<{ name: string; qty: number; unit_price: number }> = (parseResult.items ?? []).map((i: ReceiptItem) => {
    const qty = i.quantity && i.quantity >= 1 ? i.quantity : 1
    const lineTotal = i.price
    const unit_price = qty > 0 ? Math.round(lineTotal / qty) : lineTotal
    return { name: i.name.trim() || 'Item', qty, unit_price }
  })

  if (items.length === 0 && parseResult.detectedAmount > 0) {
    items.push({
      name: 'Item from receipt',
      qty: 1,
      unit_price: parseResult.detectedAmount,
    })
  }

  return { text, confidence, parseResult, items }
}
