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
  // CRITICAL: This ensures license persists across refreshes until explicitly deactivated
  // We use optimistic approach - assume license is active if token exists, verify later
  function getInitialLicenseStatus(): 'active' | 'inactive' | 'checking' | 'error' {
    // If we have a token and device ID in localStorage, assume it's active
    // The backend check will verify this, but we don't want to lose the license on refresh
    if (tokenState.value.licenseToken && tokenState.value.deviceId) {
      try {
        const storedDeviceId = localStorage.getItem(DEVICE_UUID_KEY)
        
        if (storedDeviceId) {
          // Device UUID exists - compare with stored device ID
          if (tokenState.value.deviceId === storedDeviceId) {
            // Device ID matches - license is active on this device
            return 'active'
          }
          // Device ID doesn't match - different device, license not active on this device
          return 'inactive'
        } else {
          // Device UUID doesn't exist yet - this might be first load or refresh
          // Save the device ID from token state to device UUID storage
          // This ensures device UUID is consistent across refreshes
          try {
            localStorage.setItem(DEVICE_UUID_KEY, tokenState.value.deviceId)
            // Assume active - same device, just first time checking device UUID
            return 'active'
          } catch {
            // If we can't save, still assume active (optimistic)
            // The device ID in token state is valid, just can't save UUID
            return 'active'
          }
        }
      } catch {
        // If there's any error, be optimistic - if token exists, assume active
        // This prevents license from being lost due to localStorage errors
        return 'active'
      }
    }
    // No token - license is inactive
    return 'inactive'
  }
  
  const licenseStatus = ref<'active' | 'inactive' | 'checking' | 'error'>(getInitialLicenseStatus())

  // Computed properties
  const isLicenseActive = computed(() => {
    // License is active if:
    // 1. Token exists in state
    // 2. Device ID matches current device (or is being verified)
    // 3. Status is active or checking (optimistic - if we have token, assume active until proven otherwise)
    
    if (!tokenState.value.licenseToken) {
      return false
    }

    // Get current device UUID - handle errors gracefully
    let currentDeviceUUID: string | null = null
    try {
      currentDeviceUUID = getOrCreateDeviceUUID()
    } catch {
      // If we can't get device UUID, try to get from localStorage directly
      try {
        const stored = localStorage.getItem(DEVICE_UUID_KEY)
        if (stored) {
          currentDeviceUUID = stored
        }
      } catch {
        // Ignore errors - will check device ID match below
      }
    }

    // Device must match (or we're still initializing - be optimistic)
    if (currentDeviceUUID && tokenState.value.deviceId && tokenState.value.deviceId !== currentDeviceUUID) {
      return false
    }

    // Status must be active or checking
    // If we're checking and have a token with matching device, assume active (optimistic)
    // This ensures license persists during background verification
    const statusIsActive = licenseStatus.value === 'active' || 
                          (licenseStatus.value === 'checking' && tokenState.value.licenseToken !== null)

    return statusIsActive
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
  // CRITICAL: This function should NEVER clear license just because check fails
  // Only clear license if backend EXPLICITLY confirms it's invalid
  // This ensures license persists across refreshes until explicitly deactivated
  async function checkLicenseStatus(): Promise<void> {
    // If no token, status is inactive
    if (!tokenState.value.licenseToken) {
      licenseStatus.value = 'inactive'
      return
    }

    const currentDeviceUUID = getOrCreateDeviceUUID()
    const licenseKey = normalizeLicenseKey(tokenState.value.licenseToken)

    // CRITICAL: Save current status before checking - this is our fallback
    // If status is already 'active', we MUST preserve it even if check fails
    const previousStatus = licenseStatus.value
    
    // IMPORTANT: Only set to 'checking' if status is NOT already 'active'
    // If status is 'active', keep it as 'active' (don't change during check)
    // This prevents license from appearing inactive during background verification
    if (previousStatus !== 'active') {
      licenseStatus.value = 'checking'
    }
    // If previousStatus is 'active', keep it as 'active' - don't change to 'checking'

    try {
      const result = await licenseService.checkLicenseStatus(licenseKey, currentDeviceUUID)
      
      if (result.success && result.data) {
        // Backend confirms license is active - update status to active
        licenseStatus.value = 'active'
        // Optionally update activated_at if backend provides it
        if (result.data.activated_at) {
          tokenState.value.licenseActivatedAt = result.data.activated_at
        }
        saveState()
      } else {
        // Backend says license is not active or check failed
        // CRITICAL: Only clear license if error message indicates it's TRULY invalid
        // Do NOT clear license for network errors, check failures, or generic errors
        
        const errorMessage = (result.error || '').toLowerCase()
        const isTrulyInvalid = 
          errorMessage.includes('not active') ||
          errorMessage.includes('expired') ||
          errorMessage.includes('disabled') ||
          errorMessage.includes('refunded') ||
          errorMessage.includes('another device') ||
          errorMessage.includes('not valid') ||
          errorMessage.includes('invalid license') ||
          errorMessage.includes('license is not active on this device')
        
        // CRITICAL: Only clear license if ALL conditions are met:
        // 1. Error message indicates license is TRULY invalid (not just check failure)
        // 2. Previous status was 'active' (we had an active license)
        // 3. Error specifically mentions device mismatch, expired, disabled, etc.
        if (isTrulyInvalid && previousStatus === 'active') {
          // Check if error is specific enough to warrant clearing license
          // Only clear if error explicitly says license is not active on THIS device
          // or license is expired/disabled
          const isSpecificInvalidError = 
            errorMessage.includes('not active on this device') ||
            errorMessage.includes('already active on another device') ||
            errorMessage.includes('another device') ||
            errorMessage.includes('expired') ||
            errorMessage.includes('disabled') ||
            errorMessage.includes('refunded')
          
          if (isSpecificInvalidError) {
            // Backend explicitly confirms license is invalid on this device - clear it
            licenseStatus.value = 'inactive'
            tokenState.value.licenseToken = null
            tokenState.value.licenseActivatedAt = null
            tokenState.value.deviceId = null
            saveState()
          } else {
            // Generic "not active" or "not valid" error - could be check failure
            // Keep existing status (optimistic approach)
            licenseStatus.value = 'active' // Keep active - don't clear on generic error
          }
        } else {
          // Check failed but error doesn't indicate license is truly invalid
          // OR previous status was not 'active'
          // CRITICAL: If we had 'active' status before, keep it as 'active'
          // Never change from 'active' to 'inactive' just because check failed
          if (previousStatus === 'active') {
            licenseStatus.value = 'active' // Keep active - don't change
          } else {
            // We didn't have active status before - keep what we had
            licenseStatus.value = previousStatus || 'inactive'
          }
        }
      }
    } catch (error) {
      // Network error or other unexpected error - ALWAYS preserve existing status
      // This is CRITICAL to prevent license from being lost due to temporary issues
      
      // IMPORTANT: Always revert to previous status on error
      // If previous status was 'active', keep it as 'active'
      // Never change status to 'inactive' just because check failed
      if (previousStatus === 'active') {
        licenseStatus.value = 'active' // CRITICAL: Keep active on error
      } else {
        // If we didn't have active status, revert to what we had
        licenseStatus.value = previousStatus || 'inactive'
      }
      
      // CRITICAL: Do NOT clear token state on error
      // This would cause license to be lost on refresh due to network errors
      // Only clear token state if backend EXPLICITLY confirms license is invalid
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

  // Initialize: Verify license status on store creation if token exists
  // CRITICAL: This must NOT clear the license on failure - only verify in background
  // License is already set to 'active' by getInitialLicenseStatus() if token exists
  // We verify in background but NEVER clear license just because check fails
  // This ensures license persists across refreshes until explicitly deactivated
  
  // Initialize: Verify license status on store creation if token exists
  // CRITICAL: License is already set to 'active' by getInitialLicenseStatus() if token exists
  // We verify in background but NEVER clear license just because check fails
  // This ensures license persists across refreshes until explicitly deactivated
  
  // Use nextTick or setTimeout to ensure initialization completes first
  // This prevents race condition where checkLicenseStatus() runs before status is initialized
  if (tokenState.value.licenseToken && tokenState.value.deviceId) {
    // Ensure status is 'active' before starting background check
    // This is critical - if status is not 'active', isLicenseActive will return false
    if (licenseStatus.value !== 'active') {
      // If status is not 'active' but we have token and device ID, set it to 'active'
      // This handles edge cases where initialization didn't set status correctly
      const storedDeviceId = localStorage.getItem(DEVICE_UUID_KEY)
      if (storedDeviceId === tokenState.value.deviceId || !storedDeviceId) {
        licenseStatus.value = 'active'
      }
    }
    
    // Delay background check slightly to ensure state is fully initialized
    setTimeout(() => {
      try {
        const currentDeviceUUID = getOrCreateDeviceUUID()
        // Only verify if device ID matches (same device)
        if (tokenState.value.deviceId === currentDeviceUUID) {
          // Ensure status is 'active' before checking (safety check)
          if (licenseStatus.value !== 'active') {
            licenseStatus.value = 'active'
          }
          
          // Check in background - don't await to avoid blocking initialization
          // IMPORTANT: If check fails (network error, etc.), license remains active
          // Only clear license if backend EXPLICITLY says it's invalid
          checkLicenseStatus().catch(() => {
            // Silently handle error - license status remains as initialized (active)
            // This is CRITICAL to prevent license from being lost due to temporary network issues
            // Explicitly set status back to 'active' if it was changed during check
            if (tokenState.value.licenseToken && tokenState.value.deviceId === currentDeviceUUID) {
              licenseStatus.value = 'active'
            }
          })
        } else {
          // Different device - license is not active on this device
          // Only clear if device ID truly doesn't match
          licenseStatus.value = 'inactive'
          tokenState.value.licenseToken = null
          tokenState.value.licenseActivatedAt = null
          tokenState.value.deviceId = null
          saveState()
        }
      } catch (error) {
        // If we can't verify, keep license as active (optimistic approach)
        // Don't clear license just because we can't verify
        // Ensure status remains 'active' if we have token and device ID
        if (tokenState.value.licenseToken && tokenState.value.deviceId) {
          licenseStatus.value = 'active'
        }
      }
    }, 50) // Small delay to ensure initialization is complete
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
