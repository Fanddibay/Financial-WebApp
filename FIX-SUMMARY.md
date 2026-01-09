# Fix Summary - License Activation & Deactivation

## Masalah yang Diperbaiki

### 1. ✅ Bug Deactivate License - Status Tidak Update di Database

**Masalah:**
- Ketika user deactivate license, status di database Supabase masih `active`
- `device_id` dan `activated_at` tidak di-reset ke `null`

**Root Cause:**
- `deactivateLicense` function tidak mengirim `apikey` header ke Edge Function (menyebabkan 401)
- Fallback ke direct access tidak menggunakan multiple search strategies
- Update query mungkin menggunakan token yang salah

**Solusi:**
1. ✅ Added `apikey` header ke Edge Function call (required by Supabase)
2. ✅ Improved fallback handling untuk 401/404/500 errors
3. ✅ Added multiple search strategies (4 strategies) untuk find token:
   - Exact match
   - Case-insensitive
   - Without dashes (for Lemon Squeezy format)
   - Case-insensitive without dashes
4. ✅ Updated Edge Function `deactivate-license` untuk support multiple search strategies
5. ✅ Enhanced logging untuk debugging
6. ✅ Use actual token from DB (not normalized key) untuk update query

**Files Changed:**
- `src/services/licenseService.ts` - `deactivateLicense()` and `deactivateLicenseDirect()`
- `supabase/functions/deactivate-license/index.ts` - Added multiple search strategies

### 2. ✅ Error Activation - Token Lemon Squeezy Tidak Ditemukan

**Masalah:**
- Token Lemon Squeezy `FC225A1B-6845-46D9-9BBB-6907B1F1A21D` tidak ditemukan di database
- Edge Function return 401 "Invalid JWT"
- Fallback ke direct access juga tidak menemukan token

**Root Cause:**
- Token Lemon Squeezy belum di-insert ke database
- Edge Function tidak bisa auto-insert karena return 401 (autentikasi gagal)
- Format token berbeda (dash format vs format lama)

**Solusi:**
1. ✅ Improved error messages untuk token tidak ditemukan
2. ✅ Added detection untuk Lemon Squeezy format (dash format)
3. ✅ Enhanced logging untuk debugging search strategies
4. ✅ Created SQL script untuk insert token manual (`INSERT-LEMON-SQUEEZY-TOKEN.sql`)

**Next Steps (untuk user):**

#### Option 1: Insert Token Manual ke Database (Recommended untuk Testing)

1. Buka Supabase Dashboard → SQL Editor
2. Run query:
   ```sql
   INSERT INTO license_tokens (token, status) 
   VALUES ('FC225A1B-6845-46D9-9BBB-6907B1F1A21D', 'inactive')
   ON CONFLICT (token) DO NOTHING;
   ```
3. Coba aktivasi lagi di aplikasi

#### Option 2: Fix 401 Error (untuk Production dengan Lemon Squeezy Validation)

1. Check `VITE_SUPABASE_ANON_KEY` di `.env` file
2. Pastikan anon key sama dengan yang di Supabase Dashboard (Project Settings → API)
3. Restart dev server
4. Deploy Edge Function dengan `LEMON_API_KEY` set
5. Edge Function akan auto-insert token Lemon Squeezy setelah validasi

## Testing Checklist

### Test Deactivate License:
1. ✅ Activate license dengan token yang ada di database
2. ✅ Check status di Supabase Dashboard → `license_tokens` table → status harus `active`
3. ✅ Deactivate license di aplikasi
4. ✅ Check status di Supabase Dashboard lagi → status harus `inactive`, `device_id` dan `activated_at` harus `null`

### Test Activate License:
1. ✅ Insert token Lemon Squeezy ke database (SQL di atas)
2. ✅ Input license key di aplikasi
3. ✅ System akan fallback ke direct access (bypass 401 error)
4. ✅ License should activate successfully

## Console Logging

Sekarang semua operasi memiliki detailed logging:
- 🔗 Edge Function attempts
- 🔍 Direct access fallbacks
- ✅ Success messages dengan data
- ❌ Error messages dengan details
- ⚠️ Warning messages untuk fallbacks

## Current Status

✅ **Deactivate License**: Fixed - sekarang update database dengan benar
✅ **Search Strategies**: Enhanced - support 4 strategies untuk find token
✅ **Error Handling**: Improved - better error messages dan fallback logic
✅ **Logging**: Enhanced - detailed logs untuk debugging

⚠️ **Activate License**: Token Lemon Squeezy perlu di-insert manual untuk testing
⚠️ **401 Error**: Masih terjadi karena JWT validation, tapi auto-fallback bekerja

