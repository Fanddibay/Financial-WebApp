import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { licenseService } from '@/services/licenseService'

const STORAGE_KEY = 'financial_tracker_tokens'
const USAGE_KEY = 'financial_tracker_usage'
const DEVICE_UUID_KEY = 'financial_tracker_device_uuid'

const HISTORY_TOKENS = ['H1i2J3k4L5m6', 'N7o8P9q0R1s2', 'T3u4V5w6X7y8']

interface TokenState {
  licenseToken: string | null
  historyToken: string | null
  licenseActivatedAt: string | null
  historyImportedAt: string | null
  deviceId: string | null
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
      deviceId: null,
    }
  }

  const getInitialUsage = (): UsageState => {
    try {
      const stored = localStorage.getItem(USAGE_KEY)
      if (stored) {
        const usage = JSON.parse(stored)
        // Reset usage if it's a new day
        const today =
          new Date().toISOString().split('T')[0] || new Date().toLocaleDateString('en-CA')
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
    const today = new Date().toISOString().split('T')[0] || new Date().toLocaleDateString('en-CA')
    return {
      receiptScans: 0,
      textInputs: 0,
      chatMessages: 0,
      lastResetDate: today,
    }
  }

  const tokenState = ref<TokenState>(getInitialState())
  const usageState = ref<UsageState>(getInitialUsage())
  const licenseStatus = ref<'active' | 'inactive' | 'checking' | 'error'>('inactive')

  // Computed properties
  const isLicenseActive = computed(() => {
    // License is active if:
    // 1. Token exists in state
    // 2. Device ID matches current device
    // 3. Status is active
    if (!tokenState.value.licenseToken) {
      return false
    }

    const currentDeviceUUID = getOrCreateDeviceUUID()
    const deviceMatches = tokenState.value.deviceId === currentDeviceUUID
    const statusIsActive = licenseStatus.value === 'active'

    return deviceMatches && statusIsActive
  })

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
        error:
          'Invalid token format. Token must be 12 characters and include letters, numbers, and special characters.',
      }
    }

    // Check for letters, numbers, and special characters
    const hasLetter = /[a-zA-Z]/.test(token)
    const hasNumber = /[0-9]/.test(token)
    const hasSpecial = /[^a-zA-Z0-9]/.test(token)

    if (!hasLetter || !hasNumber || !hasSpecial) {
      return {
        valid: false,
        error:
          'Invalid token format. Token must be 12 characters and include letters, numbers, and special characters.',
      }
    }

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
      return {
        valid: false,
        error: 'This token is not recognized. Please check again or contact support.',
      }
    }

    return { valid: true }
  }

  // Generate UUID v4
  function generateUUIDv4(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0
      const v = c === 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  }

  // Get or create device UUID (persistent across app loads)
  function getOrCreateDeviceUUID(): string {
    try {
      const stored = localStorage.getItem(DEVICE_UUID_KEY)
      if (stored) {
        return stored
      }
    } catch {
      // Ignore errors
    }

    // Generate new UUID v4
    const uuid = generateUUIDv4()
    try {
      localStorage.setItem(DEVICE_UUID_KEY, uuid)
    } catch {
      // Ignore storage errors
    }
    return uuid
  }

  // Get or create device ID (legacy support - now uses UUID)
  function getOrCreateDeviceId(): string {
    // Use the persistent device UUID
    return getOrCreateDeviceUUID()
  }

  // Activate license using Supabase
  async function activateLicense(token: string): Promise<{ success: boolean; error?: string }> {
    // Validate token format first
    const validation = validateTokenFormat(token)
    if (!validation.valid) {
      return { success: false, error: validation.error }
    }

    // Get current device UUID
    const currentDeviceUUID = getOrCreateDeviceUUID()

    // Set status to checking
    licenseStatus.value = 'checking'

    try {
      // Activate license via Supabase
      const result = await licenseService.activateLicense(token, currentDeviceUUID)

      if (result.success && result.data) {
        // License activated successfully
        tokenState.value.licenseToken = token
        tokenState.value.licenseActivatedAt = result.data.activated_at || new Date().toISOString()
        tokenState.value.deviceId = currentDeviceUUID
        licenseStatus.value = 'active'
        saveState()
        return { success: true }
      } else {
        // Activation failed
        licenseStatus.value = 'error'
        return {
          success: false,
          error: result.error || 'Failed to activate license. Please try again.',
        }
      }
    } catch (error) {
      console.error('Error activating license:', error)
      licenseStatus.value = 'error'
      return {
        success: false,
        error: 'Network error. Please check your connection and try again.',
      }
    }
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

  // Remove license (legacy function - kept for backward compatibility)
  function removeLicense() {
    tokenState.value.licenseToken = null
    tokenState.value.licenseActivatedAt = null
    saveState()
  }

  // Deactivate license using Supabase (removes device binding but keeps token valid for reactivation)
  async function deactivateLicense(): Promise<{ success: boolean; error?: string }> {
    if (!tokenState.value.licenseToken) {
      return { success: false, error: 'No active license found on this device.' }
    }

    const currentDeviceUUID = getOrCreateDeviceUUID()
    const token = tokenState.value.licenseToken

    licenseStatus.value = 'checking'

    try {
      // Deactivate license via Supabase
      const result = await licenseService.deactivateLicense(token, currentDeviceUUID)

      if (result.success) {
        // License deactivated successfully
        tokenState.value.licenseToken = null
        tokenState.value.licenseActivatedAt = null
        tokenState.value.deviceId = null
        licenseStatus.value = 'inactive'
        saveState()
        return { success: true }
      } else {
        licenseStatus.value = 'error'
        return {
          success: false,
          error: result.error || 'Failed to deactivate license. Please try again.',
        }
      }
    } catch (error) {
      console.error('Error deactivating license:', error)
      licenseStatus.value = 'error'
      return {
        success: false,
        error: 'Network error. Please check your connection and try again.',
      }
    }
  }

  // Check license status from Supabase
  async function checkLicenseStatus(): Promise<void> {
    if (!tokenState.value.licenseToken) {
      licenseStatus.value = 'inactive'
      return
    }

    const currentDeviceUUID = getOrCreateDeviceUUID()
    const token = tokenState.value.licenseToken

    try {
      const result = await licenseService.checkLicenseStatus(token, currentDeviceUUID)
      licenseStatus.value = result.success ? 'active' : 'inactive'
    } catch (error) {
      console.error('Error checking license status:', error)
      licenseStatus.value = 'error'
    }
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

  // Initialize: Check license status on store creation if token exists
  if (tokenState.value.licenseToken) {
    checkLicenseStatus()
  }

  return {
    // State
    tokenState,
    usageState,
    licenseStatus,
    isLicenseActive,
    isHistoryImported,
    accountType,

    // Actions
    activateLicense,
    activateHistory,
    removeLicense,
    removeHistory,
    deactivateLicense,
    checkLicenseStatus,
    getOrCreateDeviceId,
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
