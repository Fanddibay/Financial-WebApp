// Supabase Edge Function for License Status Check

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CheckLicenseRequest {
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
    const { licenseKey, deviceId }: CheckLicenseRequest = await req.json()

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

    // Check license status
    const { data: license, error } = await supabase
      .from('license_tokens')
      .select('*')
      .eq('token', normalizedKey)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Invalid license key.',
          } as LicenseResponse),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        )
      }
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to check license status.',
        } as LicenseResponse),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Check if license is active and bound to this device
    if (license.status === 'active' && license.device_id === deviceId) {
      return new Response(
        JSON.stringify({
          success: true,
          data: license,
        } as LicenseResponse),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: 'License is not active on this device.',
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
        error: 'An unexpected error occurred.',
      } as LicenseResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})

