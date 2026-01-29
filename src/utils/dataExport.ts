/**
 * Data Export/Import utilities
 * Handles collection, encryption, and restoration of app data
 */

import { encryptData, decryptData } from './encryption'
import { MAIN_POCKET_ID } from '@/services/pocketService'
import { DEFAULT_POCKET_COLOR } from '@/utils/pocketColors'

const APP_VERSION = '1.0.0'
const STORAGE_KEYS = {
  TRANSACTIONS: 'financial_tracker_transactions',
  PROFILE: 'financial_tracker_profile',
  THEME: 'financial_tracker_theme',
  POCKETS: 'financial_tracker_pockets',
} as const

export interface ExportData {
  version: string
  exportedAt: string
  transactions: unknown[]
  profile: unknown
  theme: string | null
}

/**
 * Collects all app data from localStorage.
 * Avatar is stored separately and must NOT be included in export.
 */
export function collectAppData(): ExportData {
  const transactions = JSON.parse(
    localStorage.getItem(STORAGE_KEYS.TRANSACTIONS) || '[]',
  )
  const rawProfile = JSON.parse(
    localStorage.getItem(STORAGE_KEYS.PROFILE) || 'null',
  )
  const theme = localStorage.getItem(STORAGE_KEYS.THEME)
  const profile =
    rawProfile && typeof rawProfile === 'object'
      ? (() => {
          const { avatar: _a, ...rest } = rawProfile as Record<string, unknown>
          return rest
        })()
      : rawProfile

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
  const exportPayload = {
    encrypted: true,
    version: APP_VERSION,
    data: encrypted,
  }

  // Create and download file
  const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
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

export interface PocketExportPayload {
  version: string
  exportedAt: string
  exportType: 'pocket'
  exportedBy?: string
  pockets: unknown[]
  transactions: unknown[]
}

/**
 * Exports a single pocket and its transactions as encrypted JSON.
 * Uses same encryption as global export. Safe for sharing.
 */
export async function exportPocketData(
  pocket: { name: string; [k: string]: unknown },
  transactions: unknown[],
  passphrase: string,
  exportedBy?: string,
): Promise<void> {
  if (!passphrase || passphrase.length < 4) {
    throw new Error('Passphrase harus minimal 4 karakter')
  }

  const data: PocketExportPayload = {
    version: APP_VERSION,
    exportedAt: new Date().toISOString(),
    exportType: 'pocket',
    ...(exportedBy && { exportedBy }),
    pockets: [pocket],
    transactions,
  }
  const jsonString = JSON.stringify(data, null, 2)
  const encrypted = await encryptData(jsonString, passphrase)
  const wrapper = { encrypted: true, version: APP_VERSION, data: encrypted }

  const safeName = pocket.name.replace(/\s+/g, '-').replace(/[^\w-]/g, '')
  const filename = `fanplanner-pocket-${safeName || 'pocket'}.json`

  const blob = new Blob([JSON.stringify(wrapper, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Validates legacy (global) import data structure
 */
function validateImportData(data: unknown): data is ExportData {
  if (!data || typeof data !== 'object') {
    return false
  }

  const d = data as Record<string, unknown>

  if (
    typeof d.version !== 'string' ||
    typeof d.exportedAt !== 'string' ||
    !Array.isArray(d.transactions)
  ) {
    return false
  }

  if (d.profile !== null && d.profile !== undefined && typeof d.profile !== 'object') {
    return false
  }

  for (const transaction of d.transactions as unknown[]) {
    const t = transaction as Record<string, unknown>
    if (
      !t ||
      typeof t !== 'object' ||
      typeof t.id !== 'string' ||
      typeof t.type !== 'string' ||
      typeof t.amount !== 'number'
    ) {
      return false
    }
  }

  return true
}

function validatePocketImportData(data: unknown): data is PocketExportPayload {
  if (!data || typeof data !== 'object') return false
  const d = data as Record<string, unknown>
  if (
    d.exportType !== 'pocket' ||
    !Array.isArray(d.pockets) ||
    !Array.isArray(d.transactions)
  ) {
    return false
  }
  for (const p of d.pockets as unknown[]) {
    const x = p as Record<string, unknown>
    if (!x || typeof x.name !== 'string' || typeof x.id !== 'string') return false
  }
  for (const t of d.transactions as unknown[]) {
    const x = t as Record<string, unknown>
    if (!x || typeof x.id !== 'string' || typeof x.type !== 'string' || typeof x.amount !== 'number') return false
  }
  return true
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
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

export interface ImportResult {
  transactionCount: number
  pocketCount?: number
  profileName: string
}

/**
 * Imports from encrypted file. Append-only: existing data is never overwritten.
 * Supports legacy (global) and pocket-export formats.
 */
export async function importData(
  file: File,
  passphrase: string,
): Promise<ImportResult> {
  if (!passphrase || passphrase.length < 4) {
    throw new Error('Passphrase harus minimal 4 karakter')
  }

  if (!file.type.includes('json') && !file.name.endsWith('.json')) {
    throw new Error('Tipe file tidak valid. Silakan pilih file JSON.')
  }

  let fileContent: string
  try {
    fileContent = await file.text()
  } catch (error) {
    throw new Error(
      `Gagal membaca file: ${error instanceof Error ? error.message : 'Error tidak diketahui'}`,
    )
  }

  let parsedData: unknown
  try {
    parsedData = JSON.parse(fileContent)
  } catch (error) {
    throw new Error(
      `File JSON tidak valid: ${error instanceof Error ? error.message : 'File mungkin rusak'}`,
    )
  }

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

  let decryptedString: string
  try {
    decryptedString = await decryptData(encryptedData.data, passphrase)
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Dekripsi gagal'
    if (msg.includes('Incorrect passphrase') || msg.includes('decrypt')) {
      throw new Error('Passphrase salah atau data rusak. Pastikan passphrase yang Anda masukkan benar.')
    }
    throw new Error(msg)
  }

  let payload: unknown
  try {
    payload = JSON.parse(decryptedString)
  } catch (error) {
    throw new Error(
      `Data backup rusak: ${error instanceof Error ? error.message : 'JSON tidak valid setelah dekripsi'}`,
    )
  }

  const d = payload as Record<string, unknown>
  if (d.version && d.version !== APP_VERSION) {
    console.warn(`Version mismatch: backup ${d.version}, app ${APP_VERSION}`)
  }

  // Pocket format: append pockets + transactions
  if (validatePocketImportData(payload)) {
    const existingPockets: unknown[] = JSON.parse(
      localStorage.getItem(STORAGE_KEYS.POCKETS) || '[]',
    )
    const existingTx: unknown[] = JSON.parse(
      localStorage.getItem(STORAGE_KEYS.TRANSACTIONS) || '[]',
    )

    const exportedBy = typeof d.exportedBy === 'string' ? d.exportedBy.trim() : undefined
    const pocketIdMap = new Map<string, string>()
    const newPockets: unknown[] = []

    for (const p of (payload as PocketExportPayload).pockets) {
      const old = p as Record<string, unknown>
      const newId_ = newId('pocket')
      pocketIdMap.set(old.id as string, newId_)
      const name = (old.name as string) || 'Pocket'
      const displayName = exportedBy ? `${name} ${exportedBy}` : name
      newPockets.push({
        ...old,
        id: newId_,
        name: displayName,
        balance: 0,
        color: (old.color as string) || DEFAULT_POCKET_COLOR,
      })
    }

    const now = new Date().toISOString()
    const newTx: unknown[] = []
    for (const t of (payload as PocketExportPayload).transactions) {
      const x = t as Record<string, unknown>
      const pid = x.pocketId as string
      const tid = x.transferToPocketId as string | undefined
      const srcOk = pocketIdMap.has(pid)
      const dstOk = !tid || pocketIdMap.has(tid)
      if (!srcOk || !dstOk) continue
      const date = typeof x.date === 'string' ? validateAndFixDate(x.date) : (x.date as string) || now.slice(0, 10)
      newTx.push({
        ...x,
        id: newId('tx'),
        pocketId: pocketIdMap.get(pid)!,
        transferToPocketId: tid ? pocketIdMap.get(tid) : undefined,
        date,
        createdAt: x.createdAt ?? now,
        updatedAt: x.updatedAt ?? now,
      })
    }

    const mergedPockets = [...(Array.isArray(existingPockets) ? existingPockets : []), ...newPockets]
    const mergedTx = [...(Array.isArray(existingTx) ? existingTx : []), ...newTx]

    try {
      localStorage.setItem(STORAGE_KEYS.POCKETS, JSON.stringify(mergedPockets))
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(mergedTx))
    } catch (e) {
      throw new Error(
        `Gagal menyimpan data yang diimpor: ${e instanceof Error ? e.message : 'Error penyimpanan'}`,
      )
    }

    const profile = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROFILE) || 'null') as { name?: string } | null
    return {
      transactionCount: newTx.length,
      pocketCount: newPockets.length,
      profileName: profile?.name || 'User',
    }
  }

  // Legacy format: append transactions only, assign to main pocket
  if (!validateImportData(payload)) {
    throw new Error(
      'Struktur data backup tidak valid. File mungkin rusak atau dari versi yang tidak kompatibel.',
    )
  }

  const existingTx: unknown[] = JSON.parse(
    localStorage.getItem(STORAGE_KEYS.TRANSACTIONS) || '[]',
  )
  const legacyTx = (payload as ExportData).transactions as Array<Record<string, unknown>>
  const now = new Date().toISOString()
  const appended = legacyTx.map((t) => {
    const date = typeof t.date === 'string' ? validateAndFixDate(t.date) : (t.date as string) || now.slice(0, 10)
    return {
      ...t,
      id: newId('tx'),
      pocketId: MAIN_POCKET_ID,
      date,
      createdAt: t.createdAt ?? now,
      updatedAt: t.updatedAt ?? now,
    }
  })

  const merged = [...(Array.isArray(existingTx) ? existingTx : []), ...appended]

  try {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(merged))
  } catch (e) {
    throw new Error(
      `Gagal menyimpan data yang diimpor: ${e instanceof Error ? e.message : 'Error penyimpanan'}`,
    )
  }

  const profile = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROFILE) || 'null') as { name?: string } | null
  return {
    transactionCount: appended.length,
    profileName: profile?.name || 'User',
  }
}

