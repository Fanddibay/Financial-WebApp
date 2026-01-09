import { supabase } from './supabase'

export interface LicenseToken {
  token: string
  device_id: string | null
  status: 'active' | 'inactive'
  activated_at: string | null
}

export interface LicenseActivationResult {
  success: boolean
  error?: string
  data?: LicenseToken
}

/**
 * License Service
 * Handles all license token operations via Supabase Edge Functions
 * Supports Lemon Squeezy license keys (variable length, with dashes)
 */
export class LicenseService {
  /**
   * Get Edge Function URL
   */
  private getEdgeFunctionUrl(functionName: string): string {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    if (!supabaseUrl) {
      throw new Error('VITE_SUPABASE_URL is not set')
    }
    return `${supabaseUrl}/functions/v1/${functionName}`
  }

  /**
   * Activate a license key for the current device
   * Uses Supabase Edge Function for backend validation, with fallback to direct table access
   */
  /**
   * Activate a license key via Supabase Edge Function
   * Validates with Lemon Squeezy and enforces one-device-per-license
   * Falls back to direct table access if Edge Function is unavailable
   */
  async activateLicense(licenseKey: string, deviceId: string): Promise<LicenseActivationResult> {
    // Normalize license key first (preserve dashes for Lemon Squeezy format)
    // Lemon Squeezy keys have format: XXXX-XXXX-XXXX-XXXX-XXXX
    const normalizedKey = licenseKey.trim().toUpperCase().replace(/\s+/g, '')

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase environment variables missing, using direct table access')
      return await this.activateLicenseDirect(normalizedKey, deviceId)
    }

    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/activate-license`

    try {
      // console.log('🔗 Attempting Edge Function activation')
      // console.log('  URL:', edgeFunctionUrl)
      // console.log('  License key:', normalizedKey.substring(0, 8) + '...')
      // console.log('  Device ID:', deviceId)

      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseAnonKey}`,
          apikey: supabaseAnonKey, // Required by Supabase Edge Functions
        },
        body: JSON.stringify({
          license_key: normalizedKey,
          device_id: deviceId,
        }),
      })

      // console.log('  Response status:', response.status)

      // Parse response body (only once)
      let result
      try {
        result = await response.json()
        // console.log('  Response data:', result)
      } catch (parseError) {
        // Only log parse error message, not full error object
        console.error('Failed to parse Edge Function response:', parseError instanceof Error ? parseError.message : 'Parse error')
        // If we can't parse the response, fallback to direct access
        return await this.activateLicenseDirect(normalizedKey, deviceId)
      }

      // If Edge Function returns any error status, fallback to direct access
      // This handles: 401 (auth failed), 404 (not found), 500 (server error), etc.
      if (!response.ok) {
        const errorMessage = result.message || result.error || `Error ${response.status}`
        // console.warn(`  ⚠️ Edge Function error (${response.status}):`, errorMessage)

        // For 401 (Invalid JWT) - Supabase platform validation failed
        // This happens when JWT is invalid or anon key is wrong
        // Fallback to direct access which uses valid anon key
        if (response.status === 401) {
          // console.warn('  ⚠️ Edge Function returned 401 (Invalid JWT)')
          // console.warn('  → This is a Supabase platform-level JWT validation error')
          // console.warn('  → Falling back to direct table access (bypasses Edge Function)')
          // console.warn('  → Make sure VITE_SUPABASE_ANON_KEY is correct to fix 401')
          return await this.activateLicenseDirect(normalizedKey, deviceId)
        }

        // For 404, 500, 502, 503 - Edge Function not available or error
        if ([404, 500, 502, 503].includes(response.status)) {
          // console.warn(`  ⚠️ Edge Function returned ${response.status}, falling back to direct table access`)
          return await this.activateLicenseDirect(normalizedKey, deviceId)
        }

        // For 403 (license in use) - return the error, don't fallback
        if (response.status === 403) {
          return {
            success: false,
            error: errorMessage || 'This license is already active on another device.',
          }
        }

        // For 400 (bad request) - might be invalid license, try direct access as fallback
        if (response.status === 400) {
          // console.warn('  → Edge Function validation failed, trying direct access')
          return await this.activateLicenseDirect(normalizedKey, deviceId)
        }

        // For other errors, also fallback
        console.warn(`  → Falling back to direct table access for status ${response.status}`)
        return await this.activateLicenseDirect(normalizedKey, deviceId)
      }

      // Success response from Edge Function
      if (result.success && result.data) {
        // console.log('  ✅ License activated via Edge Function')
        return {
          success: true,
          data: result.data as LicenseToken,
        }
      }

      // Unexpected response format
      console.warn('  ⚠️ Unexpected response format, falling back to direct access')
      return await this.activateLicenseDirect(normalizedKey, deviceId)
    } catch (error) {
      // Only log error message, not full error object to avoid exposing sensitive data
      console.error('Error calling Edge Function:', error instanceof Error ? error.message : 'Network error')
      // Network error, CORS error, or Edge Function not deployed - fallback to direct access
      return await this.activateLicenseDirect(normalizedKey, deviceId)
    }
  }

  /**
   * Fallback method: Direct table access for license activation
   * Used when Edge Function is not available
   */
  private async activateLicenseDirect(licenseKey: string, deviceId: string): Promise<LicenseActivationResult> {
    try {
      // console.log('🔍 Attempting direct license activation')
      // console.log('  - Searching for token:', licenseKey)
      // console.log('  - Device ID:', deviceId)

      // Try multiple search strategies
      // Strategy 1: Exact match (uppercase normalized)
      // console.log('  Strategy 1: Exact match (normalized)...')
      let foundToken = null

      const { data: exactToken, error: exactError } = await supabase
        .from('license_tokens')
        .select('*')
        .eq('token', licenseKey)
        .maybeSingle()

      if (exactToken) {
        // console.log('  ✅ Found with exact match:', exactToken.token)
        foundToken = exactToken
      } else {
        // Strategy 2: Case-insensitive search
        // console.log('  Strategy 2: Case-insensitive search...')
        const { data: caseInsensitiveToken } = await supabase
          .from('license_tokens')
          .select('*')
          .ilike('token', licenseKey)
          .maybeSingle()

        if (caseInsensitiveToken) {
          // console.log('  ✅ Found with case-insensitive match:', caseInsensitiveToken.token)
          foundToken = caseInsensitiveToken
        } else {
          // Strategy 3: Try without dash normalization (preserve dash format)
          // For Lemon Squeezy keys like E7C4B885-2F81-4836-ABB6-EE39A48FF428
          // console.log('  Strategy 3: Searching with dash format...')
          const withDash = licenseKey // Already normalized, dash preserved
          const { data: dashToken } = await supabase
            .from('license_tokens')
            .select('*')
            .eq('token', withDash)
            .maybeSingle()

          if (dashToken) {
            // console.log('  ✅ Found with dash format:', dashToken.token)
            foundToken = dashToken
          } else {
            // Strategy 4: Try without dashes (remove all dashes)
            // console.log('  Strategy 4: Searching without dashes...')
            const withoutDash = licenseKey.replace(/-/g, '')
            const { data: noDashToken } = await supabase
              .from('license_tokens')
              .select('*')
              .eq('token', withoutDash)
              .maybeSingle()

            if (noDashToken) {
              // console.log('  ✅ Found without dashes:', noDashToken.token)
              foundToken = noDashToken
            } else {
              // Strategy 5: Try case-insensitive without dashes
              // console.log('  Strategy 5: Case-insensitive without dashes...')
              const { data: noDashCaseToken } = await supabase
                .from('license_tokens')
                .select('*')
                .ilike('token', withoutDash)
                .maybeSingle()

              if (noDashCaseToken) {
                // console.log('  ✅ Found case-insensitive without dashes:', noDashCaseToken.token)
                foundToken = noDashCaseToken
              } else {
                // Strategy 6: List all tokens for debugging
                // console.log('  Strategy 6: Listing all tokens in database for debugging...')
                const { data: allTokens, error: listError } = await supabase
                  .from('license_tokens')
                  .select('token')
                  .limit(20)

                if (!listError && allTokens && allTokens.length > 0) {
                  // console.log('  Available tokens in database:', allTokens.map(t => t.token))
                } else {
                  console.warn('  ⚠️ No tokens found in database or database error')
                }
              }
            }
          }
        }
      }

      // If token found, process activation
      if (foundToken) {
        // console.log('  Processing activation for token:', foundToken.token)
        return await this.processActivation(foundToken.token, deviceId, foundToken)
      }

      // Token not found
      if (exactError && exactError.code !== 'PGRST116') {
        // Only log error message, not full error object
        console.error('Database error during activation:', exactError.message || 'Unknown database error')
        return {
          success: false,
          error: `Database error: ${exactError.message || 'Failed to validate license'}`,
        }
      }

      // console.error('  ❌ Token not found after all search strategies')
      // console.error('  Searched token:', licenseKey)

      // Check if this looks like a Lemon Squeezy license key (format: XXXX-XXXX-XXXX-XXXX-XXXX)
      const isLemonSqueezyFormat = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4,}$/.test(licenseKey)

      if (isLemonSqueezyFormat) {
        // console.log('  ℹ️  This looks like a Lemon Squeezy license key')
        // console.log('  → For Lemon Squeezy licenses, please:')
        // console.log('     1. Ensure Edge Function is deployed with LEMON_API_KEY set, OR')
        // console.log('     2. Insert this token manually to license_tokens table for testing')
        // console.log('  → SQL: INSERT INTO license_tokens (token, status) VALUES (\'' + licenseKey + '\', \'inactive\');')
      }

      // Provide helpful error message
      return {
        success: false,
        error: `License key "${licenseKey}" not found in database. ${isLemonSqueezyFormat ? 'This looks like a Lemon Squeezy license. Please ensure the Edge Function is configured with LEMON_API_KEY, or insert this token manually to the database for testing.' : 'Please verify the token exists in the license_tokens table.'}`,
      }
    } catch (error: unknown) {
      // Only log error message, not full error object to avoid exposing sensitive data
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Error activating license (direct):', errorMessage)
      return {
        success: false,
        error: `Unexpected error: ${errorMessage}`,
      }
    }
  }

  /**
   * Process license activation logic (shared between Edge Function and direct access)
   */
  private async processActivation(
    licenseKey: string,
    deviceId: string,
    existingToken: LicenseToken,
  ): Promise<LicenseActivationResult> {
    // Note: Logging removed to prevent exposing sensitive license information
    // console.log('Processing activation:', {
    //   token: licenseKey,
    //   currentStatus: existingToken.status,
    //   currentDeviceId: existingToken.device_id,
    //   requestedDeviceId: deviceId,
    // })

    // Check license status
    if (existingToken.status === 'active') {
      // License is already active
      if (existingToken.device_id === deviceId) {
        // Same device - allow reactivation
        // console.log('License already active on same device, allowing reactivation')
        return {
          success: true,
          data: existingToken as LicenseToken,
        }
      } else {
        // Different device - block activation
        // Note: Logging removed to prevent exposing device_id
        // console.warn('License already active on different device:', existingToken.device_id)
        return {
          success: false,
          error: 'This license is already active on another device. Please deactivate it on that device first before activating here.',
        }
      }
    }

    // License is inactive - activate it
    // console.log('Activating inactive license...')
    const { data: updatedToken, error: updateError } = await supabase
      .from('license_tokens')
      .update({
        device_id: deviceId,
        status: 'active',
        activated_at: new Date().toISOString(),
      })
      .eq('token', licenseKey)
      .select()
      .single()

    if (updateError) {
      // console.error('Error updating license in database:', updateError)
      // Check if it's an RLS policy issue
      if (updateError.code === '42501' || updateError.message?.includes('permission')) {
        return {
          success: false,
          error: 'Permission denied. Please check your RLS policies in Supabase.',
        }
      }
      return {
        success: false,
        error: `Failed to activate license: ${updateError.message || 'Database error'}`,
      }
    }

    // console.log('License activated successfully:', updatedToken)
    return {
      success: true,
      data: updatedToken as LicenseToken,
    }
  }

  /**
   * Deactivate a license key
   * Uses Supabase Edge Function for backend validation, with fallback to direct table access
   */
  async deactivateLicense(licenseKey: string, deviceId: string): Promise<LicenseActivationResult> {
    // Normalize license key first (preserve dashes for Lemon Squeezy format)
    const normalizedKey = licenseKey.trim().toUpperCase().replace(/\s+/g, '')

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase environment variables missing, using direct table access for deactivation')
      return await this.deactivateLicenseDirect(normalizedKey, deviceId)
    }

    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/deactivate-license`

    try {
      // console.log('🔗 Attempting Edge Function deactivation')
      // console.log('  URL:', edgeFunctionUrl)
      // console.log('  License key:', normalizedKey.substring(0, 8) + '...')
      // console.log('  Device ID:', deviceId)

      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseAnonKey}`,
          apikey: supabaseAnonKey, // Required by Supabase Edge Functions
        },
        body: JSON.stringify({
          licenseKey: normalizedKey,
          deviceId,
        }),
      })

      // console.log('  Response status:', response.status)

      // Parse response body (only once)
      let result
      try {
        result = await response.json()
        // console.log('  Response data:', result)
      } catch (parseError) {
        // Only log parse error message, not full error object
        console.error('Failed to parse Edge Function response:', parseError instanceof Error ? parseError.message : 'Parse error')
        // console.warn('  → Falling back to direct table access due to parse error')
        return await this.deactivateLicenseDirect(normalizedKey, deviceId)
      }

      // If Edge Function returns any error status, fallback to direct access
      if (!response.ok) {
        const errorMessage = result.error || result.message || `Error ${response.status}`
        // console.warn(`  ⚠️ Edge Function error (${response.status}):`, errorMessage)

        // For 401, 404, 500 - definitely fallback to direct access
        if ([401, 404, 500, 502, 503].includes(response.status)) {
          // console.warn('  → Falling back to direct table access')
          return await this.deactivateLicenseDirect(normalizedKey, deviceId)
        }

        // For 403 (license not active on device) - return the error, don't fallback
        if (response.status === 403) {
          return {
            success: false,
            error: errorMessage || 'This license is not active on this device.',
          }
        }

        // For 400 (bad request) - might be invalid license, try direct access as fallback
        if (response.status === 400) {
          // console.warn('  → Edge Function validation failed, trying direct access')
          return await this.deactivateLicenseDirect(normalizedKey, deviceId)
        }

        // For other errors, also fallback
        // console.warn(`  → Falling back to direct table access for status ${response.status}`)
        return await this.deactivateLicenseDirect(normalizedKey, deviceId)
      }

      // Success response from Edge Function
      if (result.success) {
        // console.log('  ✅ License deactivated via Edge Function')
        return { success: true, data: result.data }
      }

      // console.warn('  ⚠️ Unexpected success response format from Edge Function')
      return {
        success: false,
        error: result.error || result.message || 'Unexpected response from server',
      }
    } catch (error: unknown) {
      // Network error, CORS, or other unexpected issues with Edge Function call
      // Only log error message, not full error object
      const errorMessage = error instanceof Error ? error.message : 'Network error'
      console.error('Error calling Edge Function for deactivation:', errorMessage)
      // console.warn('  → Falling back to direct table access')
      return await this.deactivateLicenseDirect(normalizedKey, deviceId)
    }
  }

  /**
   * Fallback method: Direct table access for license deactivation
   * Uses multiple search strategies to find token (same as activate)
   */
  private async deactivateLicenseDirect(licenseKey: string, deviceId: string): Promise<LicenseActivationResult> {
    try {
      // console.log('🔍 Attempting direct license deactivation')
      // console.log('  - Searching for token:', licenseKey)
      // console.log('  - Device ID:', deviceId)

      // Try multiple search strategies (same as activate)
      let existingToken = null
      let searchError: { code?: string; message?: string } | null = null

      // Strategy 1: Exact match (normalized)
      // console.log('  Strategy 1: Exact match (normalized)...')
      const { data: exactMatch, error: exactError } = await supabase
        .from('license_tokens')
        .select('*')
        .eq('token', licenseKey)
        .maybeSingle()

      if (exactMatch) {
        // console.log('  ✅ Found with exact match:', exactMatch.token)
        existingToken = exactMatch
      } else {
        searchError = exactError
        // Strategy 2: Case-insensitive
        // console.log('  Strategy 2: Case-insensitive search...')
        const { data: caseInsensitive, error: caseError } = await supabase
          .from('license_tokens')
          .select('*')
          .ilike('token', licenseKey)
          .maybeSingle()

        if (caseInsensitive) {
          // console.log('  ✅ Found with case-insensitive match:', caseInsensitive.token)
          existingToken = caseInsensitive
        } else {
          searchError = caseError
          // Strategy 3: Without dashes (for Lemon Squeezy format)
          // console.log('  Strategy 3: Searching without dashes...')
          const withoutDash = licenseKey.replace(/-/g, '')
          const { data: noDashMatch, error: noDashError } = await supabase
            .from('license_tokens')
            .select('*')
            .eq('token', withoutDash)
            .maybeSingle()

          if (noDashMatch) {
            // console.log('  ✅ Found without dashes:', noDashMatch.token)
            existingToken = noDashMatch
          } else {
            searchError = noDashError
            // Strategy 4: Case-insensitive without dashes
            // console.log('  Strategy 4: Case-insensitive without dashes...')
            const { data: noDashCase, error: noDashCaseError } = await supabase
              .from('license_tokens')
              .select('*')
              .ilike('token', withoutDash)
              .maybeSingle()

            if (noDashCase) {
              // console.log('  ✅ Found case-insensitive without dashes:', noDashCase.token)
              existingToken = noDashCase
            } else {
              searchError = noDashCaseError
            }
          }
        }
      }

      if (!existingToken) {
        if (searchError && searchError.code !== 'PGRST116') {
          // Only log error message, not full error object
          console.error('Database error during deactivation:', searchError.message || 'Unknown database error')
          return {
            success: false,
            error: `Database error: ${searchError.message || 'Failed to find license'}`,
          }
        }
        return {
          success: false,
          error: 'License key not found.',
        }
      }

      // Verify device ownership
      if (existingToken.device_id !== deviceId) {
        // console.warn('  ⚠️ License not active on this device for deactivation')
        return {
          success: false,
          error: 'This license is not active on this device.',
        }
      }

      // Deactivate the license using the actual token from DB (important: use existingToken.token, not licenseKey)
      // console.log('  Deactivating license in database:', existingToken.token)
      // console.log('  Current status:', existingToken.status)
      // console.log('  Current device_id:', existingToken.device_id)

      const { data: updatedToken, error: updateError } = await supabase
        .from('license_tokens')
        .update({
          device_id: null,
          status: 'inactive',
          activated_at: null,
        })
        .eq('token', existingToken.token) // Use token from DB, not normalized key
        .select()
        .single()

      if (updateError) {
        // Only log error message, not full error object to avoid exposing sensitive data
        console.error('Error deactivating license in database:', updateError.message || 'Database update failed')
        // Check if it's an RLS policy issue
        if (updateError.code === '42501' || updateError.message?.includes('permission')) {
          return {
            success: false,
            error: 'Permission denied. Please check your RLS policies in Supabase.',
          }
        }
        return {
          success: false,
          error: `Failed to deactivate license: ${updateError.message || 'Database error'}`,
        }
      }

      // Note: Logging removed to prevent exposing sensitive license information
      // console.log('  ✅ License successfully deactivated in database')
      // console.log('  Updated record:', updatedToken)
      // console.log('  New status:', updatedToken?.status)
      // console.log('  New device_id:', updatedToken?.device_id)

      return {
        success: true,
        data: updatedToken as LicenseToken,
      }
    } catch (error: unknown) {
      // Only log error message, not full error object to avoid exposing sensitive data
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Unexpected error deactivating license (direct):', errorMessage)
      return {
        success: false,
        error: `Unexpected error: ${errorMessage}`,
      }
    }
  }

  /**
   * Check license status for a license key
   * Uses Supabase Edge Function for backend validation, with fallback to direct table access
   */
  async checkLicenseStatus(licenseKey: string, deviceId: string): Promise<LicenseActivationResult> {
    // Normalize license key first
    const normalizedKey = licenseKey.trim().toUpperCase().replace(/\s+/g, '')

    try {
      const response = await fetch(this.getEdgeFunctionUrl('check-license'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          licenseKey: normalizedKey,
          deviceId,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        return result as LicenseActivationResult
      }

      // Fallback to direct access
      if (response.status === 404) {
        return await this.checkLicenseStatusDirect(normalizedKey, deviceId)
      }

      const result = await response.json()
      return {
        success: false,
        error: result.error || 'Failed to check license status.',
      }
    } catch {
      // Network error, CORS, or Edge Function not deployed - fallback to direct access
      // console.warn('Edge Function unavailable, using direct table access')
      return await this.checkLicenseStatusDirect(normalizedKey, deviceId)
    }
  }

  /**
   * Fallback method: Direct table access for license status check
   * Uses multiple search strategies (same as activate/deactivate)
   */
  private async checkLicenseStatusDirect(licenseKey: string, deviceId: string): Promise<LicenseActivationResult> {
    try {
      // Try multiple search strategies
      let license = null

      // Strategy 1: Exact match
      const { data: exactMatch } = await supabase
        .from('license_tokens')
        .select('*')
        .eq('token', licenseKey)
        .maybeSingle()

      if (exactMatch) {
        license = exactMatch
      } else {
        // Strategy 2: Case-insensitive
        const { data: caseInsensitive } = await supabase
          .from('license_tokens')
          .select('*')
          .ilike('token', licenseKey)
          .maybeSingle()
        license = caseInsensitive

        if (!license) {
          // Strategy 3: Without dashes (for Lemon Squeezy format)
          const withoutDash = licenseKey.replace(/-/g, '')
          const { data: noDashMatch } = await supabase
            .from('license_tokens')
            .select('*')
            .eq('token', withoutDash)
            .maybeSingle()
          license = noDashMatch

          if (!license) {
            // Strategy 4: Case-insensitive without dashes
            const { data: noDashCase } = await supabase
              .from('license_tokens')
              .select('*')
              .ilike('token', withoutDash)
              .maybeSingle()
            license = noDashCase
          }
        }
      }

      if (!license) {
        return {
          success: false,
          error: 'Invalid license key.',
        }
      }

      // Check if license is active and bound to this device
      if (license.status === 'active' && license.device_id === deviceId) {
        return {
          success: true,
          data: license as LicenseToken,
        }
      }

      return {
        success: false,
        error: 'License is not active on this device.',
      }
    } catch (error: unknown) {
      // Only log actual errors, not sensitive information
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Error checking license status (direct):', errorMessage)
      return {
        success: false,
        error: 'An unexpected error occurred.',
      }
    }
  }
}

export const licenseService = new LicenseService()



