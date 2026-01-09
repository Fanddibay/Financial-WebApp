# Testing Lemon Squeezy License - Guide

## Masalah Saat Ini

1. **401 Error** - Edge Function return "Invalid JWT" (masalah autentikasi Supabase)
2. **Token tidak ditemukan** - Token Lemon Squeezy (`E7C4B885-2F81-4836-ABB6-EE39A48FF428`) belum ada di database

## Solusi Cepat: Insert Token Manual

Untuk testing dengan token Lemon Squeezy yang sudah Anda punya:

### Step 1: Insert Token ke Database

1. **Buka Supabase Dashboard:**
   - https://supabase.com/dashboard
   - Pilih project → **SQL Editor**

2. **Run SQL query:**
   ```sql
   INSERT INTO license_tokens (token, status) 
   VALUES ('E7C4B885-2F81-4836-ABB6-EE39A48FF428', 'inactive')
   ON CONFLICT (token) DO NOTHING;
   ```

3. **Verify token inserted:**
   ```sql
   SELECT * FROM license_tokens WHERE token = 'E7C4B885-2F81-4836-ABB6-EE39A48FF428';
   ```

### Step 2: Test Aktivasi

1. **Buka aplikasi** → Profile page
2. **Input license key:** `E7C4B885-2F81-4836-ABB6-EE39A48FF428`
3. **Klik "Activate License"**
4. **Sistem akan:**
   - Try Edge Function first (mungkin return 401)
   - Auto fallback ke direct access
   - Find token di database (karena sudah di-insert)
   - Activate license successfully

## Fix 401 Error (Optional - untuk Production)

Jika ingin fix 401 error:

1. **Check anon key di Supabase:**
   - Project Settings → API
   - Copy **anon/public** key

2. **Update `.env`:**
   ```env
   VITE_SUPABASE_ANON_KEY=<paste_anon_key_here>
   ```

3. **Restart dev server**

## Testing Flow

**Current Behavior (dengan fallback):**
```
1. Input Lemon Squeezy license key
2. Try Edge Function → Return 401
3. Auto fallback to direct access
4. Search token in database (6 strategies)
5. Find token (karena sudah di-insert manual)
6. Activate license ✅
```

**Ideal Behavior (setelah fix 401 + Edge Function deployed):**
```
1. Input Lemon Squeezy license key
2. Try Edge Function → Validate with Lemon API ✅
3. Auto-insert to database if valid
4. Activate license ✅
```

## Token Format Support

Sistem sekarang support:
- ✅ **Lemon Squeezy format** (dash): `E7C4B885-2F81-4836-ABB6-EE39A48FF428`
- ✅ **Format lama** (no dash): `A1b2C3d4E5f!`
- ✅ **Case-insensitive** search
- ✅ **Multiple search strategies** (6 strategies)

## Quick Test

**Cara paling cepat untuk test:**

1. Insert token Lemon Squeezy ke database (SQL di atas)
2. Input license key di aplikasi
3. Sistem akan auto fallback ke direct access (bypass 401 error)
4. Token ditemukan dan diaktifkan ✅

## Next Steps

1. **Untuk Testing:** Insert token manual ke database (Step 1 di atas)
2. **Untuk Production:** Fix 401 error dan deploy Edge Function dengan Lemon API key

