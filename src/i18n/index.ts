import { createI18n } from 'vue-i18n'
import id from './id'
import en from './en'

const STORAGE_KEY = 'fanplanner_language'

// Get saved language or default to Indonesian
function getSavedLanguage(): 'id' | 'en' {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'id' || saved === 'en') {
      return saved
    }
  } catch (error) {
    console.warn('Failed to read language from localStorage:', error)
  }
  return 'id' // Default to Indonesian
}

// Save language preference
export function saveLanguage(locale: 'id' | 'en') {
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch (error) {
    console.warn('Failed to save language to localStorage:', error)
  }
}

const i18n = createI18n({
  legacy: false, // Use Composition API mode
  locale: getSavedLanguage(),
  fallbackLocale: 'id',
  messages: {
    id,
    en,
  },
})

// Watch for locale changes and save to localStorage
i18n.global.locale.value = getSavedLanguage()

export default i18n
