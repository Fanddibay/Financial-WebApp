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
        const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2])
        grayscale.push(gray)
        minBrightness = Math.min(minBrightness, gray)
        maxBrightness = Math.max(maxBrightness, gray)
      }

      // Step 2: Normalize brightness and enhance contrast
      const contrastFactor = 1.2 // Increase contrast by 20%
      const brightnessRange = maxBrightness - minBrightness || 1

      for (let i = 0; i < data.length; i += 4) {
        const gray = grayscale[i / 4]
        
        // Normalize to 0-255 range with contrast enhancement
        let normalized = ((gray - minBrightness) / brightnessRange) * 255
        
        // Apply contrast adjustment
        normalized = 128 + (normalized - 128) * contrastFactor
        normalized = Math.max(0, Math.min(255, normalized))

        // Apply sharpening (unsharp mask effect)
        const sharpened = applySharpening(grayscale, i / 4, width, height, normalized)

        // Set RGB to grayscale value
        data[i] = sharpened
        data[i + 1] = sharpened
        data[i + 2] = sharpened
        // Alpha channel remains unchanged
      }

      // Step 3: Apply additional sharpening filter
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
 * Apply sharpening to a single pixel
 */
function applySharpening(
  grayscale: number[],
  index: number,
  width: number,
  height: number,
  currentValue: number
): number {
  const x = (index % width)
  const y = Math.floor(index / width)
  const sharpeningFactor = 0.3

  // Get neighboring pixels (if available)
  let sum = 0
  let count = 0

  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx
      const ny = y + dy
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const neighborIndex = ny * width + nx
        sum += grayscale[neighborIndex]
        count++
      }
    }
  }

  if (count === 0) return currentValue

  const avg = sum / count
  // Apply unsharp mask: original + (original - average) * factor
  const sharpened = currentValue + (currentValue - avg) * sharpeningFactor
  return Math.max(0, Math.min(255, sharpened))
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
            const pixelIndex = ((y + ky) * width + (x + kx)) * 4 + c
            sum += data[pixelIndex] * kernel[kernelIndex]
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
