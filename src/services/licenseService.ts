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
 * Handles all license token operations with Supabase
 */
export class LicenseService {
  private readonly tableName = 'license_tokens'

  /**
   * Activate a license token for the current device
   */
  async activateLicense(token: string, deviceId: string): Promise<LicenseActivationResult> {
    try {
      // First, check if token exists and get current status
      const { data: existingToken, error: fetchError } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('token', token)
        .single()

      if (fetchError) {
        // Token doesn't exist or other error
        if (fetchError.code === 'PGRST116') {
          // No rows returned
          return {
            success: false,
            error: 'Invalid or inactive license token.',
          }
        }
        return {
          success: false,
          error: 'Failed to validate license token. Please try again.',
        }
      }

      // Check token status
      if (existingToken.status === 'active') {
        // Token is already active
        if (existingToken.device_id === deviceId) {
          // Same device - allow reactivation
          return {
            success: true,
            data: existingToken as LicenseToken,
          }
        } else {
          // Different device - block activation
          return {
            success: false,
            error: 'This license is already active on another device.',
          }
        }
      }

      // Token is inactive - activate it
      const { data: updatedToken, error: updateError } = await supabase
        .from(this.tableName)
        .update({
          device_id: deviceId,
          status: 'active',
          activated_at: new Date().toISOString(),
        })
        .eq('token', token)
        .select()
        .single()

      if (updateError) {
        console.error('Error activating license:', updateError)
        return {
          success: false,
          error: 'Failed to activate license. Please try again.',
        }
      }

      return {
        success: true,
        data: updatedToken as LicenseToken,
      }
    } catch (error) {
      console.error('Unexpected error activating license:', error)
      return {
        success: false,
        error: 'An unexpected error occurred. Please try again.',
      }
    }
  }

  /**
   * Deactivate a license token
   */
  async deactivateLicense(token: string, deviceId: string): Promise<LicenseActivationResult> {
    try {
      // Verify the token is bound to this device
      const { data: existingToken, error: fetchError } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('token', token)
        .single()

      if (fetchError) {
        return {
          success: false,
          error: 'License token not found.',
        }
      }

      // Verify device ownership
      if (existingToken.device_id !== deviceId) {
        return {
          success: false,
          error: 'This license is not active on this device.',
        }
      }

      // Deactivate the license
      const { data: updatedToken, error: updateError } = await supabase
        .from(this.tableName)
        .update({
          device_id: null,
          status: 'inactive',
          activated_at: null,
        })
        .eq('token', token)
        .select()
        .single()

      if (updateError) {
        console.error('Error deactivating license:', updateError)
        return {
          success: false,
          error: 'Failed to deactivate license. Please try again.',
        }
      }

      return {
        success: true,
        data: updatedToken as LicenseToken,
      }
    } catch (error) {
      console.error('Unexpected error deactivating license:', error)
      return {
        success: false,
        error: 'An unexpected error occurred. Please try again.',
      }
    }
  }

  /**
   * Check license status for a token
   */
  async checkLicenseStatus(token: string, deviceId: string): Promise<LicenseActivationResult> {
    try {
      const { data: licenseToken, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('token', token)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            success: false,
            error: 'Invalid or inactive license token.',
          }
        }
        return {
          success: false,
          error: 'Failed to check license status.',
        }
      }

      // Check if license is active and bound to this device
      if (licenseToken.status === 'active' && licenseToken.device_id === deviceId) {
        return {
          success: true,
          data: licenseToken as LicenseToken,
        }
      }

      return {
        success: false,
        error: 'License is not active on this device.',
      }
    } catch (error) {
      console.error('Unexpected error checking license status:', error)
      return {
        success: false,
        error: 'An unexpected error occurred.',
      }
    }
  }
}

export const licenseService = new LicenseService()

