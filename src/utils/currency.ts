/**
 * Currency formatting utilities
 * Centralized currency formatting for easy maintenance and future changes
 */

/**
 * Format amount as Indonesian Rupiah (IDR)
 * IDR typically doesn't use decimal places in common usage
 */
export function formatIDR(amount: number): string {
  // Round to nearest whole number (IDR doesn't typically use decimals)
  const rounded = Math.round(amount)
  
  // Format with thousand separators (Indonesian format uses comma for thousands)
  const formatted = new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(rounded)
  
  return `Rp ${formatted}`
}

/**
 * Format IDR for input field (with comma as thousand separator)
 * Example: 1000000 -> "1,000,000"
 */
export function formatIDRInput(amount: number): string {
  if (isNaN(amount) || amount === 0) {
    return ''
  }
  
  // Round to nearest whole number
  const rounded = Math.round(amount)
  
  // Format with comma as thousand separator
  return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/**
 * Parse IDR string to number
 * Removes "Rp" prefix and thousand separators (both comma and dot)
 */
export function parseIDR(value: string): number {
  if (!value) return 0
  
  // Remove Rp prefix, spaces, and thousand separators (both comma and dot)
  const cleaned = value
    .replace(/Rp\s?/gi, '')
    .replace(/,/g, '')
    .replace(/\./g, '')
    .trim()
  
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? 0 : parsed
}

