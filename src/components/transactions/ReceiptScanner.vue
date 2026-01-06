<script setup lang="ts">
import { ref, computed } from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import TransactionForm from '@/components/transactions/TransactionForm.vue'
import type { TransactionFormData } from '@/types/transaction'
import { parseReceiptText, parseReceiptTextDetailed, type ReceiptParseResult } from '@/utils/receiptParser'
import { validateImageForReceipt } from '@/utils/imageValidation'
import { formatIDR } from '@/utils/currency'

interface Props {
  isOpen: boolean
  categories?: string[]
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const props = withDefaults(defineProps<Props>(), {
  categories: () => [],
})

const emit = defineEmits<{
  close: []
  scanComplete: [data: TransactionFormData]
  scanCompleteMultiple: [data: TransactionFormData[]]
}>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Tesseract: any = null

// Dynamically import Tesseract when needed
async function loadTesseract() {
  if (!Tesseract) {
    try {
      // Import tesseract.js - this will be bundled and cached by service worker
      const tesseractModule = await import('tesseract.js')
      Tesseract = tesseractModule.default
      
      // Pre-warm tesseract worker to cache assets on first load
      // This ensures worker files are cached for offline use
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        console.log('Service worker active - Tesseract.js will be cached for offline use')
      }
    } catch (error) {
      console.error('Failed to load Tesseract.js:', error)
      throw new Error('OCR library not available. Please ensure tesseract.js is installed.')
    }
  }
  return Tesseract
}

const processing = ref(false)
const processingProgress = ref(0)
const error = ref<string | null>(null)
const errorType = ref<string | null>(null)
const previewImage = ref<string | null>(null)
const scannedData = ref<Partial<TransactionFormData> | Partial<TransactionFormData>[] | null>(null)
const detailedResult = ref<ReceiptParseResult | null>(null)
const showPreview = ref(false)
const hasMultipleTransactions = ref(false)
const showFullscreenImage = ref(false)
const showItemBreakdown = ref(false)
const validationFailed = ref(false)

// Image zoom/pan state
const imageScale = ref(1)
const imagePosition = ref({ x: 0, y: 0 })
const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })

const defaultFormData: TransactionFormData = {
  type: 'expense',
  amount: 0,
  description: '',
  category: '',
  date: new Date().toISOString().split('T')[0] || '',
}

const formData = ref<TransactionFormData>({ ...defaultFormData })
const multipleFormData = ref<TransactionFormData[]>([])
const dateError = ref<string | null>(null)

// Helper function to get today's date string
function getTodayDateString(): string {
  const dateStr = new Date().toISOString().split('T')[0]
  return dateStr || new Date().toLocaleDateString('en-CA') // Fallback to YYYY-MM-DD format
}

// Helper function to validate date is not in the future
function isDateInFuture(dateString: string): boolean {
  if (!dateString) return false
  const date = new Date(dateString)
  const today = new Date()
  today.setHours(23, 59, 59, 999) // End of today
  return date > today
}

// Validate and fix date - returns corrected date and error message if any
function validateAndFixDate(dateString: string): { date: string; error: string | null } {
  if (!dateString) {
    return { date: getTodayDateString(), error: null }
  }

  if (isDateInFuture(dateString)) {
    return {
      date: getTodayDateString(),
      error: 'Tanggal yang terdeteksi dari struk adalah tanggal masa depan. Menggunakan tanggal hari ini sebagai gantinya.'
    }
  }

  return { date: dateString, error: null }
}

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    processImage(file)
  }
}

function handleCameraClick() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.capture = 'environment'
  input.onchange = (e) => handleFileSelect(e)
  input.click()
}

async function processImage(file: File) {
  processing.value = true
  processingProgress.value = 0
  error.value = null
  errorType.value = null
  previewImage.value = null
  scannedData.value = null
  detailedResult.value = null
  showPreview.value = false
  showFullscreenImage.value = false
  showItemBreakdown.value = false
  hasMultipleTransactions.value = false
  validationFailed.value = false

  try {
    // Create preview first
    const imageSrc = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        resolve(e.target?.result as string)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

    previewImage.value = imageSrc
    processingProgress.value = 10

    // Validate image before OCR
    processingProgress.value = 20
    const preValidation = await validateImageForReceipt(imageSrc)

    if (!preValidation.isValid) {
      validationFailed.value = true
      error.value = preValidation.errorMessage || 'Gambar tidak valid untuk pemindaian struk.'
      errorType.value = preValidation.errorType || 'unknown'
      processing.value = false
      return
    }

    // Load Tesseract if not already loaded
    processingProgress.value = 30
    const TesseractInstance = await loadTesseract()

    // Perform OCR with progress tracking
    processingProgress.value = 40
    const { data: { text, confidence } } = await TesseractInstance.recognize(file, 'eng', {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      logger: (m: any) => {
        if (m.status === 'recognizing text') {
          // Map OCR progress to 40-90% of total progress
          processingProgress.value = Math.min(90, 40 + Math.round(m.progress * 50))
        }
      },
    })

    processingProgress.value = 95

    // Validate OCR text for receipt patterns
    const postValidation = await validateImageForReceipt(imageSrc, text)

    if (!postValidation.isValid) {
      validationFailed.value = true
      error.value = postValidation.errorMessage || 'Tidak dapat mendeteksi informasi struk dari gambar ini.'
      errorType.value = postValidation.errorType || 'not-receipt'
      processing.value = false
      return
    }

    // Check OCR confidence (very low confidence might indicate unreadable text)
    if (confidence < 30) {
      validationFailed.value = true
      error.value = 'Teks pada gambar tidak terbaca dengan jelas. Pastikan foto jelas dan fokus pada struk. Coba ambil foto ulang.'
      errorType.value = 'no-text'
      processing.value = false
      return
    }

    processingProgress.value = 100

    // Parse the extracted text with detailed result
    const detailed = parseReceiptTextDetailed(text)
    detailedResult.value = detailed

    // Only auto-fill if we have a valid detected amount
    if (detailed.detectedAmount > 0) {
      // Parse for form data
      const parsed = parseReceiptText(text)
      scannedData.value = parsed

      // Check if multiple transactions were found
      if (Array.isArray(parsed)) {
        hasMultipleTransactions.value = true
        // Validate and fix dates for all transactions
        multipleFormData.value = parsed.map((item) => {
          const dateValidation = validateAndFixDate(item.date || '')
          if (dateValidation.error && !dateError.value) {
            dateError.value = dateValidation.error
          }
          return {
            ...defaultFormData,
            ...item,
            date: dateValidation.date,
          }
        })
      } else {
        hasMultipleTransactions.value = false
        // Validate and fix date for single transaction
        const dateValidation = validateAndFixDate(parsed.date || '')
        if (dateValidation.error) {
          dateError.value = dateValidation.error
        }
        // Merge parsed data with default form data
        formData.value = {
          ...defaultFormData,
          ...parsed,
          date: dateValidation.date,
        }
      }

      showPreview.value = true
    } else {
      // No amount detected - show form but don't auto-fill
      validationFailed.value = true
      error.value = 'Tidak dapat mendeteksi total pembayaran dari struk. Silakan masukkan informasi secara manual.'
      errorType.value = 'not-receipt'
      // Reset form to defaults (no auto-fill)
      formData.value = { ...defaultFormData }
      showPreview.value = true // Still show preview so user can see the image
    }
  } catch (err) {
    validationFailed.value = true
    error.value = err instanceof Error ? err.message : 'Gagal memproses gambar. Pastikan tesseract.js terpasang dengan benar.'
    errorType.value = 'unknown'
    console.error('OCR Error:', err)
  } finally {
    processing.value = false
    processingProgress.value = 0
  }
}

function handleSubmit() {
  // Validate dates before submission
  dateError.value = null

  if (hasMultipleTransactions.value) {
    // Validate all transactions including dates
    const validatedTransactions: TransactionFormData[] = []
    let hasFutureDate = false

    for (const transaction of multipleFormData.value) {
      if (transaction.amount > 0 && transaction.description.trim()) {
        const dateValidation = validateAndFixDate(transaction.date || '')
        if (dateValidation.error) {
          hasFutureDate = true
        }
        validatedTransactions.push({
          ...transaction,
          date: dateValidation.date,
        })
      }
    }

    if (hasFutureDate) {
      dateError.value = 'Beberapa transaksi memiliki tanggal masa depan. Tanggal telah diperbaiki menjadi hari ini.'
    }

    if (validatedTransactions.length > 0) {
      // Final validation: ensure no future dates
      const finalTransactions = validatedTransactions.map(t => {
        const finalValidation = validateAndFixDate(t.date)
        return { ...t, date: finalValidation.date }
      })
      emit('scanCompleteMultiple', finalTransactions)
      handleClose()
    }
  } else {
    // Validate single transaction date
    const dateValidation = validateAndFixDate(formData.value.date || '')
    if (dateValidation.error) {
      dateError.value = dateValidation.error
      return // Block submission
    }

    // Allow submission even if amount is 0 (user can fill manually)
    if (formData.value.description.trim()) {
      // Final validation before emitting
      const finalDateValidation = validateAndFixDate(formData.value.date)
      emit('scanComplete', {
        ...formData.value,
        date: finalDateValidation.date,
      })
      handleClose()
    }
  }
}

function updateMultipleFormData(index: number, data: TransactionFormData) {
  multipleFormData.value[index] = data
}

function handleClose() {
  previewImage.value = null
  scannedData.value = null
  detailedResult.value = null
  showPreview.value = false
  showFullscreenImage.value = false
  showItemBreakdown.value = false
  error.value = null
  errorType.value = null
  validationFailed.value = false
  dateError.value = null
  formData.value = { ...defaultFormData }
  multipleFormData.value = []
  imageScale.value = 1
  imagePosition.value = { x: 0, y: 0 }
  emit('close')
}

function handleRescan() {
  // Reset all state but keep modal open
  previewImage.value = null
  scannedData.value = null
  detailedResult.value = null
  showPreview.value = false
  showFullscreenImage.value = false
  showItemBreakdown.value = false
  error.value = null
  errorType.value = null
  validationFailed.value = false
  dateError.value = null
  formData.value = { ...defaultFormData }
  multipleFormData.value = []
  imageScale.value = 1
  imagePosition.value = { x: 0, y: 0 }
  processing.value = false
  processingProgress.value = 0
}

function openFullscreenImage() {
  showFullscreenImage.value = true
  imageScale.value = 1
  imagePosition.value = { x: 0, y: 0 }
}

function closeFullscreenImage() {
  showFullscreenImage.value = false
  imageScale.value = 1
  imagePosition.value = { x: 0, y: 0 }
}

// Image zoom/pan handlers
function handleImageWheel(e: WheelEvent) {
  e.preventDefault()
  const delta = e.deltaY > 0 ? 0.9 : 1.1
  imageScale.value = Math.max(0.5, Math.min(3, imageScale.value * delta))
}

function handleImageMouseDown(e: MouseEvent) {
  if (imageScale.value > 1) {
    isDragging.value = true
    dragStart.value = { x: e.clientX - imagePosition.value.x, y: e.clientY - imagePosition.value.y }
  }
}

function handleImageMouseMove(e: MouseEvent) {
  if (isDragging.value) {
    imagePosition.value = {
      x: e.clientX - dragStart.value.x,
      y: e.clientY - dragStart.value.y,
    }
  }
}

function handleImageMouseUp() {
  isDragging.value = false
}

function handleImageTouchStart(e: TouchEvent) {
  if (e.touches.length === 1 && imageScale.value > 1 && e.touches[0]) {
    isDragging.value = true
    dragStart.value = {
      x: e.touches[0].clientX - imagePosition.value.x,
      y: e.touches[0].clientY - imagePosition.value.y,
    }
  }
}

function handleImageTouchMove(e: TouchEvent) {
  if (isDragging.value && e.touches.length === 1 && e.touches[0]) {
    imagePosition.value = {
      x: e.touches[0].clientX - dragStart.value.x,
      y: e.touches[0].clientY - dragStart.value.y,
    }
  }
}

function handleImageTouchEnd() {
  isDragging.value = false
}

// Computed properties for UI feedback
const detectionMessage = computed(() => {
  if (!detailedResult.value) return ''

  const { detectedAmount, confidenceLevel, sourceKeyword } = detailedResult.value

  if (detectedAmount === 0) {
    return 'Total tidak terdeteksi. Silakan masukkan secara manual.'
  }

  const confidenceText = {
    high: 'Tinggi',
    medium: 'Sedang',
    low: 'Rendah',
  }[confidenceLevel]

  const keywordText = sourceKeyword ? ` (${sourceKeyword})` : ''

  return `Total terdeteksi: ${formatIDR(detectedAmount)}${keywordText} - Keyakinan: ${confidenceText}`
})

const hasItems = computed(() => {
  return detailedResult.value?.items && detailedResult.value.items.length > 0
})

// Get error icon based on error type
const errorIcon = computed(() => {
  switch (errorType.value) {
    case 'blur':
      return ['fas', 'image']
    case 'low-light':
      return ['fas', 'lightbulb']
    case 'no-text':
      return ['fas', 'file-alt']
    case 'not-receipt':
      return ['fas', 'receipt']
    case 'too-small':
      return ['fas', 'expand']
    default:
      return ['fas', 'exclamation-triangle']
  }
})
</script>

<template>
  <!-- Main Scanner Modal -->
  <BaseModal :is-open="isOpen" title="Scan Receipt" size="lg" @close="handleClose">
    <div v-if="!showPreview" class="space-y-4">
      <div class="text-center">
        <p class="text-sm text-slate-600 dark:text-slate-400">
          Take a photo or upload an image of your receipt to automatically extract transaction details
        </p>
      </div>

      <div v-if="previewImage && processing" class="space-y-4">
        <div
          class="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
          <img :src="previewImage" alt="Receipt preview" class="w-full object-contain" />
          <div class="absolute inset-0 flex items-center justify-center bg-black/50">
            <div class="text-center text-white">
              <div class="mb-2">
                <svg class="mx-auto h-12 w-12 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    fill="currentColor" />
                </svg>
              </div>
              <p class="text-sm font-medium">Processing receipt...</p>
              <p class="mt-1 text-xs text-slate-300">{{ processingProgress }}%</p>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="!error" class="space-y-3">
        <BaseCard>
          <button type="button" @click="handleCameraClick"
            class="flex w-full flex-col items-center justify-center space-y-3 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-8 transition-colors hover:border-brand hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700">
            <div class="rounded-full bg-brand p-4 text-white">
              <font-awesome-icon :icon="['fas', 'camera']" class="h-8 w-8" />
            </div>
            <div class="text-center">
              <p class="font-medium text-slate-900 dark:text-slate-100">Take a Photo</p>
              <p class="text-sm text-slate-500 dark:text-slate-400">Use your camera to capture the receipt</p>
            </div>
          </button>
        </BaseCard>

        <div class="relative">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-slate-300 dark:border-slate-600"></div>
          </div>
          <div class="relative flex justify-center text-sm">
            <span class="bg-white px-2 text-slate-500 dark:bg-slate-800 dark:text-slate-400">or</span>
          </div>
        </div>

        <BaseCard>
          <label for="file-upload"
            class="flex w-full cursor-pointer flex-col items-center justify-center space-y-3 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-8 transition-colors hover:border-brand hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700">
            <div class="rounded-full bg-brand p-4 text-white">
              <font-awesome-icon :icon="['fas', 'upload']" class="h-8 w-8" />
            </div>
            <div class="text-center">
              <p class="font-medium text-slate-900 dark:text-slate-100">Upload Image</p>
              <p class="text-sm text-slate-500 dark:text-slate-400">Select an image from your device</p>
            </div>
            <input id="file-upload" type="file" accept="image/*" class="hidden" @change="handleFileSelect" />
          </label>
        </BaseCard>
      </div>

      <!-- Error Display -->
      <div v-if="error" class="space-y-4">
        <div class="rounded-lg p-4" :class="[
          validationFailed
            ? 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800'
            : 'bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800'
        ]">
          <div class="flex items-start gap-3">
            <div class="flex-shrink-0 mt-0.5">
              <font-awesome-icon :icon="errorIcon" class="h-5 w-5" :class="validationFailed
                ? 'text-red-600 dark:text-red-400'
                : 'text-yellow-600 dark:text-yellow-400'" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-medium mb-1" :class="validationFailed
                ? 'text-red-800 dark:text-red-200'
                : 'text-yellow-800 dark:text-yellow-200'">
                {{ validationFailed ? 'Pemindaian Gagal' : 'Peringatan' }}
              </p>
              <p class="text-sm" :class="validationFailed
                ? 'text-red-700 dark:text-red-300'
                : 'text-yellow-700 dark:text-yellow-300'">
                {{ error }}
              </p>
            </div>
          </div>
        </div>

        <!-- Rescan Options -->
        <div v-if="validationFailed"
          class="rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 p-4">
          <div class="text-center mb-3">
            <p class="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">
              Scan Ulang Struk
            </p>
            <p class="text-xs text-slate-600 dark:text-slate-400">
              Coba ambil foto ulang atau upload gambar baru
            </p>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <button type="button" @click="handleRescan(); handleCameraClick()"
              class="flex flex-col items-center justify-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 p-4 transition-all hover:border-brand hover:bg-brand/5 dark:hover:bg-brand/10 hover:shadow-sm">
              <div class="rounded-full bg-brand/10 dark:bg-brand/20 p-3">
                <font-awesome-icon :icon="['fas', 'camera']" class="h-5 w-5 text-brand" />
              </div>
              <span class="text-xs font-medium text-slate-900 dark:text-slate-100">Ambil Foto</span>
            </button>
            <label for="file-upload-rescan"
              class="flex flex-col items-center justify-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 p-4 transition-all hover:border-brand hover:bg-brand/5 dark:hover:bg-brand/10 hover:shadow-sm cursor-pointer">
              <div class="rounded-full bg-brand/10 dark:bg-brand/20 p-3">
                <font-awesome-icon :icon="['fas', 'upload']" class="h-5 w-5 text-brand" />
              </div>
              <span class="text-xs font-medium text-slate-900 dark:text-slate-100">Upload Gambar</span>
              <input id="file-upload-rescan" type="file" accept="image/*" class="hidden"
                @change="(e) => { handleRescan(); handleFileSelect(e); }" />
            </label>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="space-y-4 pb-2">
      <!-- Receipt Image Preview (Clickable) -->
      <div v-if="previewImage"
        class="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 flex-shrink-0">
        <div class="relative group cursor-pointer" @click="openFullscreenImage">
          <img :src="previewImage" alt="Receipt" class="w-full object-contain max-h-48" />
          <div
            class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
            <div
              class="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 dark:bg-slate-800/90 rounded-full p-2">
              <font-awesome-icon :icon="['fas', 'expand']" class="h-4 w-4 text-slate-700 dark:text-slate-300" />
            </div>
          </div>
        </div>
        <p class="text-xs text-center text-slate-500 dark:text-slate-400 mt-1 px-2 pb-2">
          Click image to view fullscreen
        </p>
      </div>

      <!-- Smart Feedback UI -->
      <div v-if="detailedResult && !validationFailed" :class="[
        'rounded-lg p-4 text-sm flex-shrink-0',
        detailedResult.detectedAmount > 0
          ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
          : 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
      ]">
        <p class="font-medium mb-1">
          {{ detailedResult.detectedAmount > 0 ? '✓ Receipt scanned successfully!' : '⚠️ Total tidak terdeteksi' }}
        </p>
        <p class="text-xs sm:text-sm">{{ detectionMessage }}</p>
        <div v-if="hasItems && !hasMultipleTransactions" class="mt-2">
          <BaseButton variant="secondary" size="sm" @click="showItemBreakdown = !showItemBreakdown" class="text-xs">
            {{ showItemBreakdown ? 'Sembunyikan' : 'Lihat' }} Item Breakdown
          </BaseButton>
        </div>
      </div>

      <!-- Error Display in Preview Mode -->
      <div v-if="validationFailed && error" class="space-y-3 flex-shrink-0">
        <div class="rounded-lg p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800">
          <div class="flex items-start gap-3">
            <div class="flex-shrink-0 mt-0.5">
              <font-awesome-icon :icon="errorIcon" class="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-medium mb-1 text-red-800 dark:text-red-200">
                Pemindaian Gagal
              </p>
              <p class="text-sm text-red-700 dark:text-red-300">
                {{ error }}
              </p>
            </div>
          </div>
        </div>

        <!-- Rescan Options in Preview Mode -->
        <div
          class="rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 p-4">
          <div class="text-center mb-3">
            <p class="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">
              Scan Ulang Struk
            </p>
            <p class="text-xs text-slate-600 dark:text-slate-400">
              Coba ambil foto ulang atau upload gambar baru untuk hasil yang lebih baik
            </p>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <button type="button" @click="handleRescan(); handleCameraClick()"
              class="flex flex-col items-center justify-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 p-3 transition-all hover:border-brand hover:bg-brand/5 dark:hover:bg-brand/10 hover:shadow-sm active:scale-95">
              <div class="rounded-full bg-brand/10 dark:bg-brand/20 p-2.5">
                <font-awesome-icon :icon="['fas', 'camera']" class="h-4 w-4 text-brand" />
              </div>
              <span class="text-xs font-medium text-slate-900 dark:text-slate-100">Ambil Foto</span>
            </button>
            <label for="file-upload-rescan-preview"
              class="flex flex-col items-center justify-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 p-3 transition-all hover:border-brand hover:bg-brand/5 dark:hover:bg-brand/10 hover:shadow-sm active:scale-95 cursor-pointer">
              <div class="rounded-full bg-brand/10 dark:bg-brand/20 p-2.5">
                <font-awesome-icon :icon="['fas', 'upload']" class="h-4 w-4 text-brand" />
              </div>
              <span class="text-xs font-medium text-slate-900 dark:text-slate-100">Upload Gambar</span>
              <input id="file-upload-rescan-preview" type="file" accept="image/*" class="hidden"
                @change="(e) => { handleRescan(); handleFileSelect(e); }" />
            </label>
          </div>
        </div>

        <div class="rounded-lg bg-slate-100 dark:bg-slate-800/50 p-3">
          <p class="text-xs text-center text-slate-600 dark:text-slate-400">
            Atau masukkan informasi transaksi secara manual di bawah ini
          </p>
        </div>
      </div>

      <!-- Item Breakdown (Optional) -->
      <div v-if="showItemBreakdown && detailedResult?.items && !hasMultipleTransactions && !validationFailed"
        class="space-y-2 flex-shrink-0">
        <BaseCard>
          <h4 class="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Item Breakdown</h4>
          <div class="space-y-2 max-h-48 overflow-y-auto">
            <div v-for="(item, index) in detailedResult.items" :key="index"
              class="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-800/50">
              <div class="flex-1 min-w-0 pr-2">
                <p class="text-sm text-slate-900 dark:text-slate-100 truncate">{{ item.name }}</p>
                <p v-if="item.quantity && item.quantity > 1" class="text-xs text-slate-500 dark:text-slate-400">
                  Qty: {{ item.quantity }}x
                </p>
              </div>
              <p class="text-sm font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                {{ formatIDR(item.price * (item.quantity || 1)) }}
              </p>
            </div>
          </div>
        </BaseCard>
      </div>

      <!-- Multiple Transactions -->
      <div v-if="hasMultipleTransactions && !validationFailed" class="space-y-4">
        <div class="space-y-4 max-h-[50vh] overflow-y-auto pr-1 -mr-1">
          <BaseCard v-for="(transaction, index) in multipleFormData" :key="index"
            class="border-2 border-slate-200 dark:border-slate-700">
            <div class="mb-2 flex items-center justify-between">
              <h4 class="text-sm font-semibold text-slate-900 dark:text-slate-100">Item {{ index + 1 }}</h4>
            </div>
            <TransactionForm :model-value="transaction" :categories="categories" :hide-actions="true"
              @update:model-value="updateMultipleFormData(index, $event)" />
          </BaseCard>
        </div>
      </div>

      <!-- Date Error Message -->
      <div v-if="dateError"
        class="rounded-lg bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 p-4 flex-shrink-0">
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0 mt-0.5">
            <font-awesome-icon :icon="['fas', 'exclamation-triangle']"
              class="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-medium mb-1 text-yellow-800 dark:text-yellow-200">
              Peringatan Tanggal
            </p>
            <p class="text-sm text-yellow-700 dark:text-yellow-300">
              {{ dateError }}
            </p>
          </div>
        </div>
      </div>

      <!-- Single Transaction -->
      <div v-else class="flex-shrink-0 pb-4">
        <BaseCard>
          <TransactionForm v-model="formData" :categories="categories" :hide-actions="true" />
        </BaseCard>
      </div>
    </div>

    <template #footer>
      <div class="flex flex-wrap justify-end gap-2 sm:gap-3">
        <BaseButton variant="secondary" @click="handleClose" class="flex-1 sm:flex-none">
          Cancel
        </BaseButton>
        <BaseButton v-if="showPreview" :disabled="hasMultipleTransactions
          ? multipleFormData.some((t) => !t.description.trim())
          : !formData.description.trim()
          " @click="handleSubmit" class="flex-1 sm:flex-none">
          {{ hasMultipleTransactions ? `Submit ${multipleFormData.length} Item(s)` : 'Submit' }}
        </BaseButton>
      </div>
    </template>
  </BaseModal>

  <!-- Fullscreen Image Modal -->
  <Teleport to="body">
    <Transition enter-active-class="transition-opacity duration-200" enter-from-class="opacity-0"
      enter-to-class="opacity-100" leave-active-class="transition-opacity duration-200" leave-from-class="opacity-100"
      leave-to-class="opacity-0">
      <div v-if="showFullscreenImage && previewImage"
        class="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 dark:bg-black/95"
        @click="closeFullscreenImage">
        <!-- Close Button -->
        <button @click.stop="closeFullscreenImage"
          class="absolute top-4 right-4 z-10 rounded-full bg-white/10 hover:bg-white/20 dark:bg-slate-800/50 dark:hover:bg-slate-700/50 p-3 text-white transition-colors"
          aria-label="Close">
          <font-awesome-icon :icon="['fas', 'times']" class="h-6 w-6" />
        </button>

        <!-- Image Container with Zoom/Pan -->
        <div class="relative w-full h-full flex items-center justify-center overflow-hidden"
          @wheel.prevent="handleImageWheel" @mousedown="handleImageMouseDown" @mousemove="handleImageMouseMove"
          @mouseup="handleImageMouseUp" @mouseleave="handleImageMouseUp" @touchstart="handleImageTouchStart"
          @touchmove="handleImageTouchMove" @touchend="handleImageTouchEnd" @click.stop>
          <img :src="previewImage" alt="Receipt fullscreen" class="max-w-full max-h-full object-contain select-none"
            :style="{
              transform: `translate(${imagePosition.x}px, ${imagePosition.y}px) scale(${imageScale})`,
              cursor: imageScale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
              transition: isDragging ? 'none' : 'transform 0.1s',
            }" draggable="false" />
        </div>

        <!-- Zoom Controls -->
        <div
          class="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-white/10 dark:bg-slate-800/50 rounded-full px-4 py-2">
          <button @click.stop="imageScale = Math.max(0.5, imageScale - 0.25)"
            class="rounded-full bg-white/20 hover:bg-white/30 dark:bg-slate-700/50 dark:hover:bg-slate-600/50 p-2 text-white transition-colors"
            aria-label="Zoom out">
            <font-awesome-icon :icon="['fas', 'minus']" class="h-4 w-4" />
          </button>
          <span class="text-white text-sm min-w-[60px] text-center">{{ Math.round(imageScale * 100) }}%</span>
          <button @click.stop="imageScale = Math.min(3, imageScale + 0.25)"
            class="rounded-full bg-white/20 hover:bg-white/30 dark:bg-slate-700/50 dark:hover:bg-slate-600/50 p-2 text-white transition-colors"
            aria-label="Zoom in">
            <font-awesome-icon :icon="['fas', 'plus']" class="h-4 w-4" />
          </button>
          <button @click.stop="imageScale = 1; imagePosition = { x: 0, y: 0 }"
            class="rounded-full bg-white/20 hover:bg-white/30 dark:bg-slate-700/50 dark:hover:bg-slate-600/50 p-2 text-white transition-colors ml-2"
            aria-label="Reset zoom">
            <font-awesome-icon :icon="['fas', 'expand-arrows-alt']" class="h-4 w-4" />
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
