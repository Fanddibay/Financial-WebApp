/**
 * Date validation utilities for receipt scanning
 */

/**
 * Get today's date string in YYYY-MM-DD format
 */
export function getTodayDateString(): string {
  const dateStr = new Date().toISOString().split('T')[0]
  return dateStr || new Date().toLocaleDateString('en-CA')
}

/**
 * Check if a date is in the future
 */
export function isDateInFuture(dateString: string): boolean {
  if (!dateString) return false
  const date = new Date(dateString)
  const today = new Date()
  today.setHours(23, 59, 59, 999) // End of today
  return date > today
}

/**
 * Validate and fix date - returns corrected date and error message if any
 */
export function validateAndFixDate(dateString: string): { date: string; error: string | null } {
  if (!dateString) {
    return { date: getTodayDateString(), error: null }
  }

  if (isDateInFuture(dateString)) {
    return {
      date: getTodayDateString(),
      error: 'Tanggal yang terdeteksi dari struk adalah tanggal masa depan. Menggunakan tanggal hari ini sebagai gantinya.',
    }
  }

  return { date: dateString, error: null }
}
