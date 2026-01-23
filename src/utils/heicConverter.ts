/**
 * HEIC/HEIF image format detection utility
 * Note: Browser tidak mendukung konversi HEIC secara native.
 * File HEIC perlu dikonversi ke JPEG/PNG terlebih dahulu oleh user.
 */

/**
 * Check if a file is HEIC/HEIF format
 */
export function isHeicFile(file: File): boolean {
  const mimeTypes = [
    'image/heic',
    'image/heif',
    'image/heic-sequence',
    'image/heif-sequence',
  ]
  const extensions = ['.heic', '.heif', '.hif']
  
  // Check MIME type
  if (mimeTypes.includes(file.type.toLowerCase())) {
    return true
  }
  
  // Check file extension (more reliable for HEIC files)
  const fileName = file.name.toLowerCase()
  return extensions.some(ext => fileName.endsWith(ext))
}

/**
 * Validate HEIC file and provide user-friendly error message
 * Browser tidak mendukung format HEIC secara native, jadi kita perlu
 * memberitahu user untuk konversi manual terlebih dahulu
 */
export function validateHeicFile(file: File): { isValid: boolean; errorMessage?: string } {
  if (isHeicFile(file)) {
    return {
      isValid: false,
      errorMessage: 'Format HEIC tidak didukung oleh browser. Silakan konversi file ke JPEG atau PNG terlebih dahulu menggunakan aplikasi seperti:\n\n• iPhone/iPad: Settings > Camera > Formats > Most Compatible\n• Online: heic.fun atau convertio.co\n• Desktop: Preview (Mac) atau aplikasi konversi lainnya'
    }
  }
  return { isValid: true }
}

/**
 * Process image file - reject HEIC files with clear message
 * Note: Tidak melakukan konversi karena browser tidak mendukung native HEIC conversion
 */
export async function processImageFile(file: File): Promise<File> {
  const validation = validateHeicFile(file)
  if (!validation.isValid) {
    throw new Error(validation.errorMessage || 'Format HEIC tidak didukung. Silakan konversi ke JPEG/PNG terlebih dahulu.')
  }
  return file
}
