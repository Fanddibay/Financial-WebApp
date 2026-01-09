// Supabase Edge Function: Activate License
// Validates Lemon Squeezy license and enforces one-device-per-license
// NOTE: This Edge Function should NOT require JWT validation for public license activation

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

// ===============================
// Environment Variables (Edge Function only - uses Deno.env.get)
// ===============================
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const LEMON_API_KEY = Deno.env.get('LEMON_API_KEY') || '' // Optional - can be empty for testing

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// ===============================
// CORS Headers
// ===============================
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

interface ActivateLicenseRequest {
  license_key: string
  device_id: string
}

interface LicenseResponse {
  success: boolean
  message?: string
  code?: string
  data?: {
    token: string
    device_id: string | null
    status: 'active' | 'inactive'
    activated_at: string | null
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return jsonError('METHOD_NOT_ALLOWED', 'Only POST method is allowed', 405)
  }

  // IMPORTANT: Supabase Edge Functions automatically validate JWT at platform level
  // If JWT is invalid, Supabase returns 401 before our code runs
  // We cannot bypass this - it's a security feature
  // The frontend MUST send valid anon key in Authorization and apikey headers

  try {
    // Parse request body
    const body: ActivateLicenseRequest = await req.json()
    const { license_key, device_id } = body

    // Validate required fields
    if (!license_key || !device_id) {
      return jsonError('MISSING_PARAMS', 'license_key and device_id are required', 400)
    }

    // Normalize license key (trim, uppercase, preserve dashes for Lemon Squeezy format)
    // Lemon Squeezy keys have format: XXXX-XXXX-XXXX-XXXX-XXXX with dashes
    const normalizedLicenseKey = license_key.trim().toUpperCase().replace(/\s+/g, '')

    // ===============================
    // 1. VALIDATE LICENSE WITH LEMON SQUEEZY (if API key is available)
    // ===============================
    if (LEMON_API_KEY && LEMON_API_KEY !== '') {
      try {
        const lemonResponse = await fetch('https://api.lemonsqueezy.com/v1/licenses/validate', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${LEMON_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ license_key: normalizedLicenseKey }),
        })

        if (lemonResponse.ok) {
          const lemonData = await lemonResponse.json()

          // Check if license is valid
          if (!lemonData?.valid) {
            return jsonError('INVALID_LEMON_LICENSE', 'This license key is invalid or not found in Lemon Squeezy', 400)
          }

          // Check license status
          const licenseStatus = lemonData.license_key?.status
          if (['expired', 'disabled', 'refunded'].includes(licenseStatus)) {
            return jsonError(
              'LICENSE_INACTIVE',
              `This license is ${licenseStatus} and cannot be activated`,
              400,
            )
          }
          // License is valid - continue to database check
        } else {
          // Lemon Squeezy API error - log but allow fallback to database check
          const errorText = await lemonResponse.text()
          console.warn('Lemon Squeezy API error:', lemonResponse.status, errorText)
          // Don't block - allow database check to proceed
        }
      } catch (lemonError) {
        // Lemon Squeezy API unavailable - log but allow fallback to database check
        console.warn('Lemon Squeezy API unavailable, checking database instead:', lemonError)
        // Don't block - allow database check to proceed
      }
    } else {
      // No Lemon API key - skip Lemon Squeezy validation, go straight to database check
      console.log('No LEMON_API_KEY configured, skipping Lemon Squeezy validation, checking database only')
    }

    // ===============================
    // 2. CHECK EXISTING ACTIVATION IN SUPABASE
    // Try multiple search strategies for token (case-insensitive, with/without dashes)
    // ===============================
    let existingLicense = null
    let fetchError = null

    // Strategy 1: Exact match (with dashes preserved)
    const { data: exactMatch, error: exactError } = await supabase
      .from('license_tokens')
      .select('*')
      .eq('token', normalizedLicenseKey)
      .maybeSingle()

    if (exactMatch) {
      existingLicense = exactMatch
      console.log('Found license with exact match:', exactMatch.token)
    } else if (!exactError || exactError.code === 'PGRST116') {
      // Strategy 2: Case-insensitive search
      const { data: caseInsensitive } = await supabase
        .from('license_tokens')
        .select('*')
        .ilike('token', normalizedLicenseKey)
        .maybeSingle()

      if (caseInsensitive) {
        existingLicense = caseInsensitive
        console.log('Found license with case-insensitive match:', caseInsensitive.token)
      } else {
        // Strategy 3: Search without dashes (for Lemon Squeezy format compatibility)
        const withoutDashes = normalizedLicenseKey.replace(/-/g, '')
        const { data: noDashMatch } = await supabase
          .from('license_tokens')
          .select('*')
          .eq('token', withoutDashes)
          .maybeSingle()

        if (noDashMatch) {
          existingLicense = noDashMatch
          console.log('Found license without dashes:', noDashMatch.token)
        } else {
          // Strategy 4: Case-insensitive without dashes
          const { data: noDashCase } = await supabase
            .from('license_tokens')
            .select('*')
            .ilike('token', withoutDashes)
            .maybeSingle()

          if (noDashCase) {
            existingLicense = noDashCase
            console.log('Found license case-insensitive without dashes:', noDashCase.token)
          } else {
            fetchError = exactError
          }
        }
      }
    } else {
      fetchError = exactError
    }

    // Only return error if it's not a "not found" error
    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Database fetch error:', fetchError)
      return jsonError('DATABASE_ERROR', 'Failed to check license status', 500)
    }

    // ===============================
    // 3. ENFORCE ONE-DEVICE-PER-LICENSE LOGIC
    // ===============================

    // Case A: License already active on different device
    if (
      existingLicense &&
      existingLicense.status === 'active' &&
      existingLicense.device_id !== device_id
    ) {
      return jsonError(
        'LICENSE_IN_USE',
        'This license is already active on another device. Please deactivate it on that device first.',
        403,
      )
    }

    // Case B: License already active on same device (re-activation)
    if (
      existingLicense &&
      existingLicense.status === 'active' &&
      existingLicense.device_id === device_id
    ) {
      return jsonSuccess('License already active on this device', existingLicense)
    }

    // ===============================
    // 4. ACTIVATE LICENSE
    // ===============================
    const activationPayload = {
      token: normalizedLicenseKey, // Use normalized key (with dashes if Lemon Squeezy)
      device_id,
      status: 'active' as const,
      activated_at: new Date().toISOString(),
    }

    let activatedLicense

    if (existingLicense) {
      // Update existing record - use the token from database (preserve original format)
      const tokenToUpdate = existingLicense.token
      const { data: updated, error: updateError } = await supabase
        .from('license_tokens')
        .update({
          ...activationPayload,
          token: tokenToUpdate, // Keep original token format from DB
        })
        .eq('token', tokenToUpdate)
        .select()
        .single()

      if (updateError) {
        console.error('Database update error:', updateError)
        return jsonError('DATABASE_ERROR', 'Failed to activate license', 500)
      }

      activatedLicense = updated
    } else {
      // Insert new record (Lemon Squeezy license validated, now insert to DB)
      // This is a new Lemon Squeezy license that passed validation
      const { data: inserted, error: insertError } = await supabase
        .from('license_tokens')
        .insert(activationPayload)
        .select()
        .single()

      if (insertError) {
        console.error('Database insert error:', insertError)
        // If insert fails due to duplicate (token exists but wasn't found by search),
        // try to update instead
        if (insertError.code === '23505') {
          // Duplicate key error - token exists, try update
          const { data: updated, error: updateError } = await supabase
            .from('license_tokens')
            .update(activationPayload)
            .eq('token', normalizedLicenseKey)
            .select()
            .single()

          if (updateError) {
            console.error('Database update error after insert conflict:', updateError)
            return jsonError('DATABASE_ERROR', 'Failed to activate license', 500)
          }

          activatedLicense = updated
        } else {
          return jsonError('DATABASE_ERROR', `Failed to activate license: ${insertError.message}`, 500)
        }
      } else {
        activatedLicense = inserted
      }
    }

    // ===============================
    // 5. RETURN SUCCESS
    // ===============================
    return jsonSuccess('License activated successfully', activatedLicense)
  } catch (error) {
    console.error('Unexpected error:', error)
    return jsonError('SERVER_ERROR', 'An unexpected error occurred', 500)
  }
})

// ===============================
// Helper Functions
// ===============================
function jsonSuccess(message: string, data?: LicenseResponse['data']): Response {
  return new Response(
    JSON.stringify({
      success: true,
      message,
      data,
    } as LicenseResponse),
    {
      status: 200,
      headers: corsHeaders,
    },
  )
}

function jsonError(code: string, message: string, status: number = 400): Response {
  return new Response(
    JSON.stringify({
      success: false,
      code,
      message,
    } as LicenseResponse),
    {
      status,
      headers: corsHeaders,
    },
  )
}
