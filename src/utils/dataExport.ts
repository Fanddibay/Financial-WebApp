/**
 * Data Export/Import utilities
 * Handles collection, encryption, and restoration of app data
 */

import { encryptData, decryptData } from './encryption'

const APP_VERSION = '1.0.0'
const STORAGE_KEYS = {
  TRANSACTIONS: 'financial_tracker_transactions',
  PROFILE: 'financial_tracker_profile',
  THEME: 'financial_tracker_theme',
} as const

export interface ExportData {
  version: string
  exportedAt: string
  transactions: unknown[]
  profile: unknown
  theme: string | null
}

/**
 * Collects all app data from localStorage
 */
export function collectAppData(): ExportData {
  const transactions = JSON.parse(
    localStorage.getItem(STORAGE_KEYS.TRANSACTIONS) || '[]',
  )
  const profile = JSON.parse(
    localStorage.getItem(STORAGE_KEYS.PROFILE) || 'null',
  )
  const theme = localStorage.getItem(STORAGE_KEYS.THEME)

  return {
    version: APP_VERSION,
    exportedAt: new Date().toISOString(),
    transactions,
    profile,
    theme,
  }
}

/**
 * Exports app data as encrypted JSON file
 */
export async function exportData(passphrase: string): Promise<void> {
  if (!passphrase || passphrase.length < 4) {
    throw new Error('Passphrase harus minimal 4 karakter')
  }

  // Collect all data
  const data = collectAppData()
  const jsonString = JSON.stringify(data, null, 2)

  // Encrypt data
  const encrypted = await encryptData(jsonString, passphrase)

  // Create encrypted export object
  const exportData = {
    encrypted: true,
    version: APP_VERSION,
    data: encrypted,
  }

  // Create and download file
  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `financial-tracker-backup-${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Validates imported data structure
 */
function validateImportData(data: unknown): data is ExportData {
  if (!data || typeof data !== 'object') {
    return false
  }

  const d = data as Record<string, unknown>

  // Check required fields - make profile optional (can be null)
  if (
    typeof d.version !== 'string' ||
    typeof d.exportedAt !== 'string' ||
    !Array.isArray(d.transactions)
  ) {
    return false
  }

  // Profile can be null or object
  if (d.profile !== null && d.profile !== undefined && typeof d.profile !== 'object') {
    return false
  }

  // Validate transactions structure - allow empty array
  for (const transaction of d.transactions) {
    if (
      !transaction ||
      typeof transaction !== 'object' ||
      typeof (transaction as Record<string, unknown>).id !== 'string' ||
      typeof (transaction as Record<string, unknown>).type !== 'string' ||
      typeof (transaction as Record<string, unknown>).amount !== 'number'
    ) {
      return false
    }
  }

  return true
}

/**
 * Validate and fix date to ensure it's not in the future
 */
function validateAndFixDate(dateString: string): string {
  if (!dateString) {
    return new Date().toISOString().split('T')[0]
  }
  const date = new Date(dateString)
  const today = new Date()
  today.setHours(23, 59, 59, 999) // End of today
  if (date > today) {
    // Return today's date if future date is detected
    return new Date().toISOString().split('T')[0]
  }
  return dateString
}

/**
 * Imports and restores app data from encrypted file
 */
export async function importData(
  file: File,
  passphrase: string,
): Promise<{ transactionCount: number; profileName: string }> {
  if (!passphrase || passphrase.length < 4) {
    throw new Error('Passphrase harus minimal 4 karakter')
  }

  // Validate file type
  if (!file.type.includes('json') && !file.name.endsWith('.json')) {
    throw new Error('Tipe file tidak valid. Silakan pilih file JSON.')
  }

  // Read file
  let fileContent: string
  try {
    fileContent = await file.text()
  } catch (error) {
    throw new Error(
      `Gagal membaca file: ${error instanceof Error ? error.message : 'Error tidak diketahui'}`,
    )
  }

  // Parse JSON
  let parsedData: unknown
  try {
    parsedData = JSON.parse(fileContent)
  } catch (error) {
    throw new Error(
      `File JSON tidak valid: ${error instanceof Error ? error.message : 'File mungkin rusak'}`,
    )
  }

  // Check if encrypted
  if (
    !parsedData ||
    typeof parsedData !== 'object' ||
    !('encrypted' in parsedData) ||
    !('data' in parsedData)
  ) {
    throw new Error(
      'Format file backup tidak valid. File ini sepertinya bukan backup terenkripsi.',
    )
  }

  const encryptedData = parsedData as { encrypted: boolean; data: string }

  if (!encryptedData.encrypted || typeof encryptedData.data !== 'string') {
    throw new Error('Format file backup tidak valid.')
  }

  // Decrypt data
  let decryptedString: string
  try {
    decryptedString = await decryptData(encryptedData.data, passphrase)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Dekripsi gagal'
    if (errorMessage.includes('Incorrect passphrase') || errorMessage.includes('decrypt')) {
      throw new Error('Passphrase salah atau data rusak. Pastikan passphrase yang Anda masukkan benar.')
    }
    throw new Error(errorMessage)
  }

  // Parse decrypted JSON
  let importData: unknown
  try {
    importData = JSON.parse(decryptedString)
  } catch (error) {
    throw new Error(
      `Data backup rusak: ${error instanceof Error ? error.message : 'JSON tidak valid setelah dekripsi'}`,
    )
  }

  // Validate data structure
  if (!validateImportData(importData)) {
    throw new Error(
      'Struktur data backup tidak valid. File mungkin rusak atau dari versi yang tidak kompatibel. Pastikan file ini adalah backup yang valid dari aplikasi ini.',
    )
  }

  // Check version compatibility (basic check)
  if (importData.version !== APP_VERSION) {
    console.warn(
      `Version mismatch: backup is ${importData.version}, app is ${APP_VERSION}`,
    )
    // Continue anyway, but warn user
  }

  // Validate and fix dates in imported transactions
  const validatedTransactions = (importData.transactions as Array<Record<string, unknown>>).map((transaction) => {
    if (transaction.date && typeof transaction.date === 'string') {
      const originalDate = transaction.date
      const fixedDate = validateAndFixDate(transaction.date)
      if (originalDate !== fixedDate) {
        console.warn(`Fixed future date in imported transaction: ${originalDate} -> ${fixedDate}`)
      }
      return {
        ...transaction,
        date: fixedDate,
      }
    }
    return transaction
  })

  // Store data in localStorage (this is the only place we modify storage)
  try {
    localStorage.setItem(
      STORAGE_KEYS.TRANSACTIONS,
      JSON.stringify(validatedTransactions),
    )
    localStorage.setItem(
      STORAGE_KEYS.PROFILE,
      JSON.stringify(importData.profile),
    )
    if (importData.theme) {
      localStorage.setItem(STORAGE_KEYS.THEME, importData.theme)
    } else {
      localStorage.removeItem(STORAGE_KEYS.THEME)
    }
  } catch (error) {
    throw new Error(
      `Gagal menyimpan data yang diimpor: ${error instanceof Error ? error.message : 'Error penyimpanan'}`,
    )
  }

  const profile = (importData.profile as { name?: string }) || {}
  return {
    transactionCount: validatedTransactions.length,
    profileName: profile?.name || 'User',
  }
}

