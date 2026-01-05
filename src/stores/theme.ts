import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

type Theme = 'light' | 'dark'

const STORAGE_KEY = 'financial_tracker_theme'

export const useThemeStore = defineStore('theme', () => {
  const theme = ref<Theme>((localStorage.getItem(STORAGE_KEY) as Theme) || 'light')

  // Apply theme to document
  function applyTheme(newTheme: Theme) {
    theme.value = newTheme
    localStorage.setItem(STORAGE_KEY, newTheme)
    
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  // Toggle theme
  function toggleTheme() {
    applyTheme(theme.value === 'light' ? 'dark' : 'light')
  }

  // Initialize theme on mount
  function initTheme() {
    applyTheme(theme.value)
  }

  return {
    theme,
    applyTheme,
    toggleTheme,
    initTheme,
  }
})

