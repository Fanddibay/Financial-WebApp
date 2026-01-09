// Supabase Edge Function for License Deactivation

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DeactivateLicenseRequest {
  licenseKey: string
  deviceId: string
}

interface LicenseResponse {
  success: boolean
  error?: string
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

  try {
    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Parse request body
    const { licenseKey, deviceId }: DeactivateLicenseRequest = await req.json()

    // Validate required fields
    if (!licenseKey || !deviceId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'License key and device ID are required.',
        } as LicenseResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Normalize license key
    const normalizedKey = licenseKey.trim().toUpperCase().replace(/\s+/g, '')

    // Verify the license exists and is bound to this device
    // Try multiple search strategies (same as activate)
    let existingLicense = null
    let fetchError = null

    // Strategy 1: Exact match
    const { data: exactMatch, error: exactError } = await supabase
      .from('license_tokens')
      .select('*')
      .eq('token', normalizedKey)
      .maybeSingle()

    if (exactMatch) {
      existingLicense = exactMatch
    } else if (!exactError || exactError.code === 'PGRST116') {
      // Strategy 2: Case-insensitive
      const { data: caseInsensitive } = await supabase
        .from('license_tokens')
        .select('*')
        .ilike('token', normalizedKey)
        .maybeSingle()

      if (caseInsensitive) {
        existingLicense = caseInsensitive
      } else {
        // Strategy 3: Without dashes
        const withoutDashes = normalizedKey.replace(/-/g, '')
        const { data: noDashMatch } = await supabase
          .from('license_tokens')
          .select('*')
          .eq('token', withoutDashes)
          .maybeSingle()

        if (noDashMatch) {
          existingLicense = noDashMatch
        } else {
          fetchError = exactError
        }
      }
    } else {
      fetchError = exactError
    }

    if (!existingLicense) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'License key not found.',
        } as LicenseResponse),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Verify device ownership
    if (existingLicense.device_id !== deviceId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'This license is not active on this device.',
        } as LicenseResponse),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Deactivate the license using the actual token from DB (preserve original format)
    const tokenToUpdate = existingLicense.token
    const { data: updatedLicense, error: updateError } = await supabase
      .from('license_tokens')
      .update({
        device_id: null,
        status: 'inactive',
        activated_at: null,
      })
      .eq('token', tokenToUpdate) // Use token from DB, not normalized key
      .select()
      .single()

    if (updateError) {
      console.error('Error deactivating license:', updateError)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to deactivate license. Please try again later.',
        } as LicenseResponse),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Success
    return new Response(
      JSON.stringify({
        success: true,
        data: updatedLicense,
      } as LicenseResponse),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'An unexpected error occurred. Please try again later.',
      } as LicenseResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})

