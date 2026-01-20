/**
 * Utility untuk mapping kategori transaksi ke emoji icon
 */

// Mapping kategori expense (pengeluaran) ke emoji
// Support both Indonesian and English category names
const expenseCategoryIcons: Record<string, string> = {
  // Indonesian
  Makanan: '🍽️',
  Transportasi: '🚗',
  Belanja: '🛍️',
  Tagihan: '📋',
  Hiburan: '🎮',
  Kesehatan: '🏥',
  Investasi: '📈',
  Invest: '📈',
  Lainnya: '📦',
  // English
  Food: '🍽️',
  Transportation: '🚗',
  Shopping: '🛍️',
  Bills: '📋',
  Entertainment: '🎮',
  Health: '🏥',
  Investment: '📈',
  Other: '📦',
}

// Mapping kategori income (pemasukan) ke emoji
// Support both Indonesian and English category names
const incomeCategoryIcons: Record<string, string> = {
  // Indonesian
  Gaji: '💵',
  Freelance: '💼',
  Investasi: '💰',
  Invest: '💰',
  Hadiah: '🎁',
  Lainnya: '📦',
  // English
  Salary: '💵',
  Investment: '💰',
  Gift: '🎁',
  Other: '📦',
}

/**
 * Mendapatkan emoji icon untuk kategori tertentu
 * @param category - Nama kategori
 * @param type - Tipe transaksi ('income' | 'expense')
 * @returns Emoji icon untuk kategori, atau default icon jika tidak ditemukan
 */
export function getCategoryIcon(category: string, type: 'income' | 'expense'): string {
  const categoryIcons = type === 'income' ? incomeCategoryIcons : expenseCategoryIcons
  
  // Trim whitespace
  const trimmedCategory = category.trim()
  
  // Cari exact match
  if (categoryIcons[trimmedCategory]) {
    return categoryIcons[trimmedCategory]
  }
  
  // Case-insensitive search
  const lowerCategory = trimmedCategory.toLowerCase()
  const matchedKey = Object.keys(categoryIcons).find(
    key => key.toLowerCase() === lowerCategory
  )
  
  if (matchedKey) {
    return categoryIcons[matchedKey]
  }
  
  // Try to match common variations
  const variations: Record<string, string> = {
    // Expense variations
    'food': '🍽️',
    'makanan': '🍽️',
    'transportation': '🚗',
    'transportasi': '🚗',
    'shopping': '🛍️',
    'belanja': '🛍️',
    'bills': '📋',
    'tagihan': '📋',
    'entertainment': '🎮',
    'hiburan': '🎮',
    'health': '🏥',
    'kesehatan': '🏥',
    'other': '📦',
    'lainnya': '📦',
    // Income variations
    'salary': '💵',
    'gaji': '💵',
    'freelance': '💼',
    'investment': '📈',
    'investasi': '📈',
    'gift': '🎁',
    'hadiah': '🎁',
  }
  
  if (variations[lowerCategory]) {
    return variations[lowerCategory]
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
