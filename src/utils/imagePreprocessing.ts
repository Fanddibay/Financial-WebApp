/**
 * Image preprocessing utilities for OCR
 * Enhances image quality before OCR processing to improve accuracy
 */

/**
 * Preprocess image for better OCR accuracy:
 * - Enhance contrast
 * - Convert to grayscale
 * - Apply sharpening
 * - Normalize brightness
 */
export async function preprocessImageForOCR(imageFile: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) {
        reject(new Error('Could not get canvas context'))
        return
      }

      // Set canvas size (maintain aspect ratio, max 2000px on longest side for performance)
      const maxSize = 2000
      let width = img.width
      let height = img.height
      if (width > maxSize || height > maxSize) {
        const scale = maxSize / Math.max(width, height)
        width = Math.floor(width * scale)
        height = Math.floor(height * scale)
      }

      canvas.width = width
      canvas.height = height

      // Draw original image
      ctx.drawImage(img, 0, 0, width, height)

      // Get image data
      const imageData = ctx.getImageData(0, 0, width, height)
      const data = imageData.data

      // Step 1: Convert to grayscale and enhance contrast
      let minBrightness = 255
      let maxBrightness = 0
      const grayscale: number[] = []

      for (let i = 0; i < data.length; i += 4) {
        // Convert to grayscale using luminance formula
        const r = data[i] ?? 0
        const g = data[i + 1] ?? 0
        const b = data[i + 2] ?? 0
        const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b)
        grayscale.push(gray)
        minBrightness = Math.min(minBrightness, gray)
        maxBrightness = Math.max(maxBrightness, gray)
      }

      // Step 2: Normalize brightness and enhance contrast
      const contrastFactor = 1.3 // Increase contrast by 30%
      const brightnessRange = maxBrightness - minBrightness || 1

      for (let i = 0; i < data.length; i += 4) {
        const gray = grayscale[i / 4] ?? 128

        // Normalize to 0-255 range with contrast enhancement
        let normalized = ((gray - minBrightness) / brightnessRange) * 255

        // Apply contrast adjustment
        normalized = 128 + (normalized - 128) * contrastFactor
        normalized = Math.max(0, Math.min(255, normalized))

        // Store enhanced gray for thresholding
        grayscale[i / 4] = normalized
      }

      // Step 3: Apply Adaptive Thresholding (Binarization)
      // This is the most important step for Tesseract OCR accuracy
      const thresholdedData = applyAdaptiveThreshold(grayscale, width, height)

      for (let i = 0; i < data.length; i += 4) {
        const val = thresholdedData[i / 4] ?? 255
        data[i] = val
        data[i + 1] = val
        data[i + 2] = val
      }

      // Step 4: Apply additional sharpening filter to edges
      const sharpenedData = applySharpeningFilter(imageData, width, height)

      // Put processed image data back
      ctx.putImageData(sharpenedData, 0, 0)

      // Convert canvas to blob and create new File
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to create blob from canvas'))
            return
          }
          const processedFile = new File([blob], imageFile.name, {
            type: 'image/png',
            lastModified: Date.now(),
          })
          resolve(processedFile)
        },
        'image/png',
        0.95 // High quality
      )
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(imageFile)
  })
}

/**
 * Apply Adaptive Thresholding (Binarization)
 * Uses local mean to decide if a pixel should be black or white
 */
function applyAdaptiveThreshold(
  grayscale: number[],
  width: number,
  height: number
): Uint8ClampedArray {
  const thresholded = new Uint8ClampedArray(grayscale.length)
  const windowSize = 25 // Local window size (increase for larger images)
  const offset = 10 // Subtraction constant

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x

      // Calculate local mean
      let sum = 0
      let count = 0
      const halfWindow = Math.floor(windowSize / 2)

      for (let wy = -halfWindow; wy <= halfWindow; wy++) {
        for (let wx = -halfWindow; wx <= halfWindow; wx++) {
          const ny = y + wy
          const nx = x + wx
          if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
            sum += grayscale[ny * width + nx] ?? 128
            count++
          }
        }
      }

      const mean = sum / count
      const pixelValue = grayscale[index] ?? 128

      // Binarize based on local mean
      thresholded[index] = pixelValue > mean - offset ? 255 : 0
    }
  }

  return thresholded
}

/**
 * Apply sharpening filter using convolution
 */
function applySharpeningFilter(imageData: ImageData, width: number, height: number): ImageData {
  const data = imageData.data
  const newData = new Uint8ClampedArray(data)

  // Sharpening kernel (unsharp mask)
  const kernel = [
    0, -1, 0,
    -1, 5, -1,
    0, -1, 0
  ]

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) { // RGB channels only
        let sum = 0
        let kernelIndex = 0

        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const py = y + ky
            const px = x + kx
            const pixelIndex = (py * width + px) * 4 + c
            const val = data[pixelIndex] ?? 0
            sum += val * (kernel[kernelIndex] ?? 0)
            kernelIndex++
          }
        }

        const newIndex = (y * width + x) * 4 + c
        newData[newIndex] = Math.max(0, Math.min(255, sum))
      }
    }
  }

  return new ImageData(newData, width, height)
}

/**
 * Alternative: Simple preprocessing that's faster but less effective
 * Use this if full preprocessing is too slow
 */
export async function quickPreprocessImageForOCR(imageFile: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Could not get canvas context'))
        return
      }

      // Set canvas size (max 2000px for performance)
      const maxSize = 2000
      let width = img.width
      let height = img.height
      if (width > maxSize || height > maxSize) {
        const scale = maxSize / Math.max(width, height)
        width = Math.floor(width * scale)
        height = Math.floor(height * scale)
      }

      canvas.width = width
      canvas.height = height

      // Apply image smoothing for better quality
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'

      // Draw with slight brightness/contrast adjustment via CSS filters
      ctx.filter = 'contrast(1.1) brightness(1.05)'
      ctx.drawImage(img, 0, 0, width, height)

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to create blob'))
            return
          }
          const processedFile = new File([blob], imageFile.name, {
            type: 'image/png',
            lastModified: Date.now(),
          })
          resolve(processedFile)
        },
        'image/png',
        0.95
      )
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(imageFile)
  })
}
