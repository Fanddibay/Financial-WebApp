/**
 * Utility untuk mapping kategori transaksi ke emoji icon
 */

// Mapping kategori expense (pengeluaran) ke emoji
const expenseCategoryIcons: Record<string, string> = {
  Makanan: '🌭',
  Transportasi: '🚗',
  Belanja: '🛒',
  Tagihan: '📄',
  Hiburan: '🎬',
  Kesehatan: '💊',
  Investasi: '💰',
  Invest: '💰',
  Lainnya: '📦',
}

// Mapping kategori income (pemasukan) ke emoji
const incomeCategoryIcons: Record<string, string> = {
  Gaji: '💵',
  Freelance: '💼',
  Investasi: '💰',
  Invest: '💰',
  Hadiah: '🎁',
  Lainnya: '📦',
}

/**
 * Mendapatkan emoji icon untuk kategori tertentu
 * @param category - Nama kategori
 * @param type - Tipe transaksi ('income' | 'expense')
 * @returns Emoji icon untuk kategori, atau default icon jika tidak ditemukan
 */
export function getCategoryIcon(category: string, type: 'income' | 'expense'): string {
  const categoryIcons = type === 'income' ? incomeCategoryIcons : expenseCategoryIcons
  
  // Cari exact match
  if (categoryIcons[category]) {
    return categoryIcons[category]
  }
  
  // Case-insensitive search
  const lowerCategory = category.toLowerCase()
  const matchedKey = Object.keys(categoryIcons).find(
    key => key.toLowerCase() === lowerCategory
  )
  
  if (matchedKey) {
    return categoryIcons[matchedKey]
  }
  
  // Default icon berdasarkan type
  return type === 'income' ? '💵' : '📦'
}

/**
 * Mendapatkan display text untuk kategori dengan icon
 * @param category - Nama kategori
 * @param type - Tipe transaksi ('income' | 'expense')
 * @returns String dengan format "icon category"
 */
export function getCategoryWithIcon(category: string, type: 'income' | 'expense'): string {
  const icon = getCategoryIcon(category, type)
  return `${icon} ${category}`
}
