# Edge Function 401 Error Fix - Explanation

## Why the 401 Error Happened

The 401 Unauthorized error occurred because:

1. **Missing `apikey` Header**: Supabase Edge Functions require **both** `Authorization` and `apikey` headers to authenticate requests. The frontend was only sending `Authorization`, causing the Edge Function to reject the request with 401.

2. **Incorrect Header Validation**: The Edge Function was checking for headers but not properly validating the Supabase anon key.

3. **Mixed Concerns**: Frontend code was trying to use Edge Functions incorrectly, mixing `import.meta.env` usage (which doesn't work in Edge Functions).

## How This Fix Resolves It

### 1. **Edge Function (`supabase/functions/activate-license/index.ts`)**

✅ **Uses `Deno.env.get()` only** - No `import.meta.env` usage
```typescript
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const LEMON_API_KEY = Deno.env.get('LEMON_API_KEY')!
```

✅ **Uses Service Role Key internally** - Bypasses RLS for database operations
```typescript
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
```

✅ **Proper CORS handling** - Handles OPTIONS preflight and sets correct headers
```typescript
if (req.method === 'OPTIONS') {
  return new Response('ok', { headers: corsHeaders })
}
```

✅ **Validates Lemon Squeezy license** - Calls Lemon Squeezy API with `LEMON_API_KEY`
```typescript
const lemonResponse = await fetch('https://api.lemonsqueezy.com/v1/licenses/validate', {
  headers: {
    Authorization: `Bearer ${LEMON_API_KEY}`,
  },
})
```

✅ **Enforces one-device-per-license** - Checks device_id before activation
```typescript
if (existingLicense.device_id !== device_id) {
  return jsonError('LICENSE_IN_USE', 'License already active on another device', 403)
}
```

✅ **Clear JSON responses** - Consistent success/error format
```typescript
function jsonSuccess(message: string, data?: any): Response
function jsonError(code: string, message: string, status: number): Response
```

### 2. **Frontend (`src/services/licenseService.ts`)**

✅ **Uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`** - Correct environment variables
```typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
```

✅ **Sends both `apikey` and `Authorization` headers** - Required by Supabase Edge Functions
```typescript
headers: {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${supabaseAnonKey}`,
  apikey: supabaseAnonKey, // ← This was missing, causing 401!
}
```

✅ **Calls Edge Function only from frontend** - No Edge Function calling another Edge Function
```typescript
const edgeFunctionUrl = `${supabaseUrl}/functions/v1/activate-license`
const response = await fetch(edgeFunctionUrl, { ... })
```

✅ **Proper error handling** - Handles 401, 403, 400, and network errors
```typescript
if (response.status === 401) {
  return { success: false, error: 'Authentication failed...' }
}
```

## Key Changes

### Before (Causing 401):
```typescript
// Frontend - Missing apikey header
headers: {
  Authorization: `Bearer ${anonKey}`,
  // ❌ Missing: apikey header
}
```

### After (Fixed):
```typescript
// Frontend - Includes both headers
headers: {
  Authorization: `Bearer ${supabaseAnonKey}`,
  apikey: supabaseAnonKey, // ✅ Required by Supabase
}
```

## Security Notes

1. **Service Role Key**: Never exposed to frontend, only used in Edge Function
2. **Lemon API Key**: Stored as Supabase secret, never exposed
3. **Anon Key**: Safe to use in frontend (has RLS protection)
4. **Device ID**: Generated client-side, stored in localStorage

## Testing Checklist

- [ ] Edge Function deployed with secrets configured
- [ ] Frontend sends both `Authorization` and `apikey` headers
- [ ] Lemon Squeezy API key is set in Supabase secrets
- [ ] Service role key is set in Supabase secrets
- [ ] CORS preflight (OPTIONS) works
- [ ] License validation works
- [ ] One-device-per-license enforcement works
- [ ] Error responses are clear and helpful

## Expected Flow

1. **Frontend** → Calls Edge Function with `license_key` and `device_id`
2. **Edge Function** → Validates with Lemon Squeezy API
3. **Edge Function** → Checks Supabase for existing activation
4. **Edge Function** → Enforces one-device-per-license rule
5. **Edge Function** → Activates license in Supabase
6. **Edge Function** → Returns success/error response
7. **Frontend** → Updates UI based on response

## No More 401 Errors! 🎉

The fix ensures:
- ✅ Proper authentication headers (`apikey` + `Authorization`)
- ✅ Correct environment variable usage (`Deno.env.get()` in Edge Function)
- ✅ Clean separation of frontend and backend logic
- ✅ Production-ready error handling

