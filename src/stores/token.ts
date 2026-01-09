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
  
  // Initialize license status optimistically - if token exists in localStorage, assume active
  // This ensures license persists across refreshes until explicitly deactivated
  function getInitialLicenseStatus(): 'active' | 'inactive' | 'checking' | 'error' {
    // If we have a token and device ID in localStorage, assume it's active
    // The backend check will verify this, but we don't want to lose the license on refresh
    if (tokenState.value.licenseToken && tokenState.value.deviceId) {
      // Check if device ID matches current device by checking localStorage directly
      // This avoids calling getOrCreateDeviceUUID() which might not be ready yet
      try {
        const storedDeviceId = localStorage.getItem(DEVICE_UUID_KEY)
        if (storedDeviceId) {
          // Device UUID exists - compare with stored device ID
          if (tokenState.value.deviceId === storedDeviceId) {
            // Device ID matches - assume license is active
            // Background check will verify with backend
            return 'active'
          }
          // Device ID doesn't match - different device, license not active
          return 'inactive'
        } else {
          // Device UUID doesn't exist yet - this might be first load
          // Save the device ID from token state to device UUID storage
          // This ensures device UUID is consistent
          try {
            localStorage.setItem(DEVICE_UUID_KEY, tokenState.value.deviceId)
            // Assume active for now - background check will verify
            return 'active'
          } catch {
            // Ignore storage errors - assume inactive if we can't store
          }
        }
      } catch {
        // Ignore errors - assume inactive if we can't verify
      }
    }
    return 'inactive'
  }
  
  const licenseStatus = ref<'active' | 'inactive' | 'checking' | 'error'>(getInitialLicenseStatus())

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

  // Normalize license key: trim whitespace, convert to uppercase, remove extra spaces
  // Preserve dashes for Lemon Squeezy format (e.g., E7C4B885-2F81-4836-ABB6-EE39A48FF428)
  // No format validation - all validation is done by backend
  function normalizeLicenseKey(key: string): string {
    if (!key) return ''
    // Trim and uppercase, remove spaces, but preserve dashes
    return key.trim().toUpperCase().replace(/\s+/g, '')
  }

  // Minimal frontend validation - only checks if key is not empty after normalization
  // All other validation is delegated to backend
  function validateLicenseKeyInput(key: string): { valid: boolean; error?: string } {
    const normalized = normalizeLicenseKey(key)
    if (!normalized) {
      return { valid: false, error: 'Please enter your license key before continuing.' }
    }
    return { valid: true }
  }

  // Validate history token (legacy - not actively used but kept for compatibility)
  function validateHistoryToken(token: string): { valid: boolean; error?: string } {
    const normalized = normalizeLicenseKey(token)
    const validation = validateLicenseKeyInput(normalized)
    if (!validation.valid) {
      return validation
    }

    // Check if token is in the list
    if (!HISTORY_TOKENS.includes(normalized)) {
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

  // Activate license using Supabase Edge Function
  async function activateLicense(licenseKey: string): Promise<{ success: boolean; error?: string }> {
    // Normalize license key (trim, uppercase, remove extra spaces)
    const normalizedKey = normalizeLicenseKey(licenseKey)

    // Minimal frontend validation - only check if key is not empty
    const validation = validateLicenseKeyInput(normalizedKey)
    if (!validation.valid) {
      return { success: false, error: validation.error }
    }

    // Get current device UUID
    const currentDeviceUUID = getOrCreateDeviceUUID()

    // Set status to checking
    licenseStatus.value = 'checking'

    try {
      // Activate license via Supabase Edge Function
      // Backend handles all validation (format, existence, device binding, etc.)
      const result = await licenseService.activateLicense(normalizedKey, currentDeviceUUID)

      if (result.success && result.data) {
        // License activated successfully
        // Use the actual token from database (not normalizedKey) to ensure consistency
        tokenState.value.licenseToken = result.data.token || normalizedKey
        tokenState.value.licenseActivatedAt = result.data.activated_at || new Date().toISOString()
        tokenState.value.deviceId = currentDeviceUUID
        licenseStatus.value = 'active'
        saveState()
        // console.log('License activated successfully:', result.data.token)
        return { success: true }
      } else {
        // Activation failed - show backend error message
        licenseStatus.value = 'error'
        console.error('License activation failed:', result.error)
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

  // Deactivate license using Supabase Edge Function
  async function deactivateLicense(): Promise<{ success: boolean; error?: string }> {
    if (!tokenState.value.licenseToken) {
      return { success: false, error: 'No active license found on this device.' }
    }

    const currentDeviceUUID = getOrCreateDeviceUUID()
    const licenseKey = normalizeLicenseKey(tokenState.value.licenseToken)

    licenseStatus.value = 'checking'

    try {
      // Deactivate license via Supabase Edge Function
      const result = await licenseService.deactivateLicense(licenseKey, currentDeviceUUID)

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

  // Check license status from Supabase Edge Function
  // This is called on app initialization to verify license status
  // Important: If check fails (network error, etc.), we keep the existing status
  // to prevent license from being lost on refresh
  async function checkLicenseStatus(): Promise<void> {
    if (!tokenState.value.licenseToken) {
      licenseStatus.value = 'inactive'
      return
    }

    const currentDeviceUUID = getOrCreateDeviceUUID()
    const licenseKey = normalizeLicenseKey(tokenState.value.licenseToken)

    // Set status to checking while verifying
    const previousStatus = licenseStatus.value
    licenseStatus.value = 'checking'

    try {
      const result = await licenseService.checkLicenseStatus(licenseKey, currentDeviceUUID)
      
      if (result.success) {
        // Backend confirms license is active
        licenseStatus.value = 'active'
      } else {
        // Backend says license is not active - only set to inactive if backend explicitly says so
        // This handles cases where license was deactivated on another device or expired
        licenseStatus.value = 'inactive'
        // Clear local state if backend confirms license is not valid
        tokenState.value.licenseToken = null
        tokenState.value.licenseActivatedAt = null
        tokenState.value.deviceId = null
        saveState()
      }
    } catch (error) {
      // Network error or other unexpected error - keep existing status
      // This prevents license from being lost due to temporary network issues
      console.error('Error checking license status:', error)
      // Revert to previous status if it was active, otherwise set to error
      if (previousStatus === 'active') {
        licenseStatus.value = 'active' // Keep active status if we had it before
      } else {
        licenseStatus.value = 'error' // Only set error if we didn't have active status
      }
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
  // This verifies with backend but doesn't block - license is already active in state
  // We check in background to verify, but don't clear license if check fails (optimistic approach)
  // This ensures license persists across refreshes until explicitly deactivated
  if (tokenState.value.licenseToken && tokenState.value.deviceId) {
    // Get current device UUID to verify device match
    try {
      const currentDeviceUUID = getOrCreateDeviceUUID()
      // Only verify if device ID matches (same device)
      if (tokenState.value.deviceId === currentDeviceUUID) {
        // Check in background - don't await to avoid blocking initialization
        // If check fails (network error, etc.), license remains active
        checkLicenseStatus().catch((error) => {
          // Silently handle error - license status remains as initialized (active)
          // This prevents license from being lost due to temporary network issues
          // console.error('Background license check failed:', error)
        })
      } else {
        // Different device - license is not active on this device
        licenseStatus.value = 'inactive'
        // Clear token state for different device
        tokenState.value.licenseToken = null
        tokenState.value.licenseActivatedAt = null
        tokenState.value.deviceId = null
        saveState()
      }
    } catch (error) {
      // If we can't get device UUID, keep license as active (optimistic)
      // Background check will verify later
      // console.error('Error getting device UUID during initialization:', error)
    }
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
    normalizeLicenseKey,
    validateLicenseKeyInput,

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
