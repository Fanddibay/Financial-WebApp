# Supabase Edge Functions Setup Guide

## Overview

The license activation system now uses Supabase Edge Functions for backend validation, supporting Lemon Squeezy license keys with variable lengths.

## Edge Functions Created

1. **activate-license** - Activates a license key for a device
2. **deactivate-license** - Deactivates a license key
3. **check-license** - Checks the status of a license key

## Setup Instructions

### 1. Deploy Edge Functions

#### Option A: Using Supabase CLI (Recommended)

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref yfjxcxvgxfdruxfhsbrk

# Deploy all functions
supabase functions deploy activate-license
supabase functions deploy deactivate-license
supabase functions deploy check-license
```

#### Option B: Using Supabase Dashboard

1. Go to Supabase Dashboard → Edge Functions
2. For each function (`activate-license`, `deactivate-license`, `check-license`):
   - Click "Create a new function"
   - Copy-paste the code from `supabase/functions/[function-name]/index.ts`
   - Deploy

### 2. Set Environment Variables

The Edge Functions need the following environment variables:

- `SUPABASE_URL` - Your Supabase project URL (automatically set)
- `SUPABASE_SERVICE_ROLE_KEY` - Your service role key (for database operations)

To set the service role key:

1. Go to Supabase Dashboard → Project Settings → API
2. Copy the "service_role" key (NOT the anon key)
3. In Edge Functions settings, add environment variable:
   - Name: `SUPABASE_SERVICE_ROLE_KEY`
   - Value: (paste your service role key)

### 3. Configure CORS (if needed)

The Edge Functions already include CORS headers, but if you need to restrict origins:

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://yourdomain.com', // Specific domain
  // or '*' for all origins (already configured)
}
```

## Function Details

### activate-license

**Endpoint:** `POST /functions/v1/activate-license`

**Request Body:**

```json
{
  "licenseKey": "YOUR-LICENSE-KEY",
  "deviceId": "device-uuid"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "token": "YOUR-LICENSE-KEY",
    "device_id": "device-uuid",
    "status": "active",
    "activated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses:**

- `400` - Missing required fields
- `404` - Invalid license key
- `403` - License already active on another device
- `500` - Server error

### deactivate-license

**Endpoint:** `POST /functions/v1/deactivate-license`

**Request Body:**

```json
{
  "licenseKey": "YOUR-LICENSE-KEY",
  "deviceId": "device-uuid"
}
```

### check-license

**Endpoint:** `POST /functions/v1/check-license`

**Request Body:**

```json
{
  "licenseKey": "YOUR-LICENSE-KEY",
  "deviceId": "device-uuid"
}
```

## Testing

### Local Testing

1. Start Supabase locally:

```bash
supabase start
```

2. Deploy functions locally:

```bash
supabase functions serve activate-license
```

3. Test with curl:

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/activate-license' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"licenseKey":"TEST-KEY","deviceId":"test-device"}'
```

### Production Testing

After deploying, test from your frontend application:

1. Open the app
2. Go to Profile page
3. Try activating a license key
4. Check browser console for any errors
5. Verify in Supabase table that license was activated

## Troubleshooting

### "Function not found"

- Verify functions are deployed
- Check function names match exactly
- Ensure you're using the correct project URL

### "Permission denied"

- Check that `SUPABASE_SERVICE_ROLE_KEY` is set correctly
- Verify RLS policies allow the operations needed

### "CORS error"

- Check CORS headers in Edge Function code
- Verify the request origin is allowed

### "Network error"

- Check Edge Function logs in Supabase Dashboard
- Verify environment variables are set
- Check function deployment status

## Security Notes

1. **Service Role Key**: Keep this secret! Never expose it to the frontend.
2. **CORS**: Restrict origins in production to your domain only.
3. **Validation**: All license validation happens in the Edge Function (backend).
4. **RLS**: Table still uses RLS as an additional security layer.
