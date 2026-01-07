import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

const STORAGE_KEY = 'financial_tracker_tokens'
const USAGE_KEY = 'financial_tracker_usage'

// Hardcoded tokens (3-5 tokens as specified)
// Format: 12 characters with letters, numbers, and special characters
const LICENSE_TOKENS = [
  'A1b2C3d4E5f!', // letters, numbers, special char (!)
  'X9y8Z7w6V5u@', // letters, numbers, special char (@)
  'M3n2O1p0Q9r#', // letters, numbers, special char (#)
  'S7t6U5v4W3x$', // letters, numbers, special char ($)
  'K1l2M3n4O5p%', // letters, numbers, special char (%)
]

const HISTORY_TOKENS = [
  'H1i2J3k4L5m6',
  'N7o8P9q0R1s2',
  'T3u4V5w6X7y8',
]

interface TokenState {
  licenseToken: string | null
  historyToken: string | null
  licenseActivatedAt: string | null
  historyImportedAt: string | null
}

interface UsageState {
  receiptScans: number
  textInputs: number
  chatMessages: number
  lastResetDate: string
}

export const useTokenStore = defineStore('token', () => {
  // Initialize from localStorage
  const getInitialState = (): TokenState => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        return JSON.parse(stored)
      }
    } catch {
      // Ignore parse errors
    }
    return {
      licenseToken: null,
      historyToken: null,
      licenseActivatedAt: null,
      historyImportedAt: null,
    }
  }

  const getInitialUsage = (): UsageState => {
    try {
      const stored = localStorage.getItem(USAGE_KEY)
      if (stored) {
        const usage = JSON.parse(stored)
        // Reset usage if it's a new day
        const today = new Date().toISOString().split('T')[0]
        if (usage.lastResetDate !== today) {
          return {
            receiptScans: 0,
            textInputs: 0,
            chatMessages: 0,
            lastResetDate: today,
          }
        }
        return usage
      }
    } catch {
      // Ignore parse errors
    }
    return {
      receiptScans: 0,
      textInputs: 0,
      chatMessages: 0,
      lastResetDate: new Date().toISOString().split('T')[0],
    }
  }

  const tokenState = ref<TokenState>(getInitialState())
  const usageState = ref<UsageState>(getInitialUsage())

  // Computed properties
  const isLicenseActive = computed(() => !!tokenState.value.licenseToken)
  const isHistoryImported = computed(() => !!tokenState.value.historyToken)
  const accountType = computed(() => (isLicenseActive.value ? 'premium' : 'basic'))

  // Save to localStorage
  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tokenState.value))
    } catch {
      // Ignore storage errors
    }
  }

  function saveUsage() {
    try {
      localStorage.setItem(USAGE_KEY, JSON.stringify(usageState.value))
    } catch {
      // Ignore storage errors
    }
  }

  // Validate token format
  function validateTokenFormat(token: string): { valid: boolean; error?: string } {
    if (!token || token.trim() === '') {
      return { valid: false, error: 'Please enter your token before continuing.' }
    }

    if (token.length !== 12) {
      return {
        valid: false,
        error: 'Invalid token format. Token must be 12 characters and include letters, numbers, and special characters.',
      }
    }

    // Check for letters, numbers, and special characters
    const hasLetter = /[a-zA-Z]/.test(token)
    const hasNumber = /[0-9]/.test(token)
    const hasSpecial = /[^a-zA-Z0-9]/.test(token)

    if (!hasLetter || !hasNumber || !hasSpecial) {
      return {
        valid: false,
        error: 'Invalid token format. Token must be 12 characters and include letters, numbers, and special characters.',
      }
    }

    return { valid: true }
  }

  // Validate license token
  function validateLicenseToken(token: string): { valid: boolean; error?: string } {
    const formatCheck = validateTokenFormat(token)
    if (!formatCheck.valid) {
      return formatCheck
    }

    // Check if token is in the list
    if (!LICENSE_TOKENS.includes(token)) {
      return { valid: false, error: 'This token is not recognized. Please check again or contact support.' }
    }

    // Check if token is already used (optional - can be removed if tokens can be reused)
    // For now, we'll allow re-activation

    return { valid: true }
  }

  // Validate history token
  function validateHistoryToken(token: string): { valid: boolean; error?: string } {
    const formatCheck = validateTokenFormat(token)
    if (!formatCheck.valid) {
      return formatCheck
    }

    // Check if token is in the list
    if (!HISTORY_TOKENS.includes(token)) {
      return { valid: false, error: 'This token is not recognized. Please check again or contact support.' }
    }

    return { valid: true }
  }

  // Activate license
  function activateLicense(token: string): { success: boolean; error?: string } {
    const validation = validateLicenseToken(token)
    if (!validation.valid) {
      return { success: false, error: validation.error }
    }

    tokenState.value.licenseToken = token
    tokenState.value.licenseActivatedAt = new Date().toISOString()
    saveState()

    return { success: true }
  }

  // Activate history token
  function activateHistory(token: string): { success: boolean; error?: string } {
    const validation = validateHistoryToken(token)
    if (!validation.valid) {
      return { success: false, error: validation.error }
    }

    tokenState.value.historyToken = token
    tokenState.value.historyImportedAt = new Date().toISOString()
    saveState()

    return { success: true }
  }

  // Remove license
  function removeLicense() {
    tokenState.value.licenseToken = null
    tokenState.value.licenseActivatedAt = null
    saveState()
  }

  // Remove history token
  function removeHistory() {
    tokenState.value.historyToken = null
    tokenState.value.historyImportedAt = null
    saveState()
  }

  // Usage tracking
  const MAX_BASIC_USAGE = 3

  function canUseReceiptScan(): boolean {
    if (isLicenseActive.value) return true
    return usageState.value.receiptScans < MAX_BASIC_USAGE
  }

  function canUseTextInput(): boolean {
    if (isLicenseActive.value) return true
    return usageState.value.textInputs < MAX_BASIC_USAGE
  }

  function canUseChat(): boolean {
    if (isLicenseActive.value) return true
    return usageState.value.chatMessages < MAX_BASIC_USAGE
  }

  function recordReceiptScan() {
    if (!isLicenseActive.value) {
      usageState.value.receiptScans++
      saveUsage()
    }
  }

  function recordTextInput() {
    if (!isLicenseActive.value) {
      usageState.value.textInputs++
      saveUsage()
    }
  }

  function recordChatMessage() {
    if (!isLicenseActive.value) {
      usageState.value.chatMessages++
      saveUsage()
    }
  }

  function getRemainingUsage(feature: 'receipt' | 'text' | 'chat'): number {
    if (isLicenseActive.value) return Infinity
    const used = {
      receipt: usageState.value.receiptScans,
      text: usageState.value.textInputs,
      chat: usageState.value.chatMessages,
    }[feature]
    return Math.max(0, MAX_BASIC_USAGE - used)
  }

  return {
    // State
    tokenState,
    usageState,
    isLicenseActive,
    isHistoryImported,
    accountType,

    // Actions
    activateLicense,
    activateHistory,
    removeLicense,
    removeHistory,
    validateTokenFormat,

    // Usage tracking
    canUseReceiptScan,
    canUseTextInput,
    canUseChat,
    recordReceiptScan,
    recordTextInput,
    recordChatMessage,
    getRemainingUsage,
    MAX_BASIC_USAGE,
  }
})

