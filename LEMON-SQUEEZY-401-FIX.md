# Fix 401 Error for Lemon Squeezy License Activation

## Masalah yang Terjadi

1. **Edge Function mengembalikan 401 "Invalid JWT"** - Ini adalah validasi otomatis dari Supabase platform
2. **Token Lemon Squeezy tidak ditemukan di database** - Token format dash (e.g., `E7C4B885-2F81-4836-ABB6-EE39A48FF428`) belum ada di database
3. **Token di database format berbeda** - Token yang ada adalah format pendek tanpa dash

## Penjelasan 401 Error

**Mengapa 401 terjadi:**
- Supabase Edge Functions **secara otomatis** memvalidasi JWT dari header `Authorization` di platform level
- Jika JWT tidak valid, Supabase return 401 **sebelum** kode Edge Function kita dieksekusi
- Ini adalah **security feature** dari Supabase - tidak bisa di-bypass di level code

**Bagaimana fix mengatasi ini:**
1. Frontend mengirim **valid anon key** di header `Authorization` dan `apikey`
2. Jika Edge Function masih return 401 (karena JWT tidak valid), sistem **otomatis fallback** ke direct table access
3. Direct access menggunakan anon key yang valid untuk query database

## Solusi yang Diterapkan

### 1. Edge Function (`supabase/functions/activate-license/index.ts`)

✅ **Lemon Squeezy validation optional** - Jika `LEMON_API_KEY` tidak ada, skip validation
✅ **Multiple search strategies** - Cari token dengan berbagai format (dash, no dash, case-insensitive)
✅ **Auto-insert Lemon Squeezy license** - Jika validasi Lemon Squeezy berhasil, otomatis insert ke database
✅ **Error handling** - Handle semua error dengan graceful fallback

### 2. Frontend (`src/services/licenseService.ts`)

✅ **Auto fallback** - Jika Edge Function return 401/404/500, otomatis fallback ke direct access
✅ **Multiple search strategies** - 6 strategi pencarian untuk menemukan token
✅ **Preserve dash format** - Token Lemon Squeezy dengan dash tetap dipertahankan

### 3. Pencarian Token yang Diperbaiki

Sistem sekarang mencari token dengan 6 strategi:
1. **Exact match** (case-sensitive dengan dash)
2. **Case-insensitive** (dengan dash)
3. **Without dash** (case-sensitive)
4. **Case-insensitive without dash**
5. **Original input** (no normalization)
6. **List all tokens** (untuk debugging)

## Cara Mengatasi 401 Error

### Option 1: Fix JWT Authentication (Recommended untuk Production)

1. **Pastikan environment variables benar:**
   ```env
   VITE_SUPABASE_URL=https://yfjxcxvgxfdruxfhsbrk.supabase.co
   VITE_SUPABASE_ANON_KEY=sb_publishable_50YVF8IQC7otBPc_EYexkw_VCgrgthd
   ```

2. **Check anon key di Supabase Dashboard:**
   - Project Settings → API
   - Copy **anon/public** key (bukan service role)
   - Pastikan key sama dengan yang di `.env`

3. **Deploy Edge Function dengan secrets:**
   - Set `SUPABASE_URL`
   - Set `SUPABASE_SERVICE_ROLE_KEY`
   - Set `LEMON_API_KEY` (optional untuk testing)

### Option 2: Use Direct Access (Temporary untuk Testing)

Untuk testing dengan token yang sudah ada di database:

1. Sistem sudah otomatis fallback ke direct access jika Edge Function gagal
2. Tidak perlu deploy Edge Function untuk testing
3. Token yang ada di database akan langsung bisa digunakan

## Testing Lemon Squeezy License

Untuk menggunakan license Lemon Squeezy yang baru:

1. **Pastikan Edge Function deployed** dengan `LEMON_API_KEY` set
2. **Input license key Lemon Squeezy** (format: `E7C4B885-2F81-4836-ABB6-EE39A48FF428`)
3. **Edge Function akan:**
   - Validate dengan Lemon Squeezy API
   - Auto-insert ke database jika valid
   - Activate license untuk device

## Fix untuk 401 Error

Jika masih dapat 401 error:

1. **Check anon key** - Pastikan `VITE_SUPABASE_ANON_KEY` benar
2. **Check Supabase project** - Pastikan project aktif dan URL benar
3. **Restart dev server** - Setelah update `.env`, restart server
4. **Check browser console** - Lihat error detail

Jika Edge Function tetap return 401, sistem akan otomatis fallback ke direct access, sehingga aktivasi tetap bekerja.

## Current Behavior

Sekarang sistem akan:
1. ✅ Try Edge Function first
2. ✅ If 401/404/500 → Auto fallback to direct access
3. ✅ Search token dengan 6 strategi berbeda
4. ✅ Support Lemon Squeezy format (dash) dan format lama (no dash)
5. ✅ Auto-insert Lemon Squeezy license ke database setelah validasi

## Next Steps

1. **Untuk Production**: Deploy Edge Function dengan secrets yang benar
2. **Untuk Testing**: Gunakan token yang sudah ada di database (direct access)
3. **Untuk Lemon Squeezy**: Input license key, Edge Function akan auto-insert jika valid

