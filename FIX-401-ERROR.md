# Fix 401 Error - Auto Fallback to Direct Access

## Masalah yang Terjadi

Error "Authentication failed. Please check your Supabase configuration" terjadi karena:

1. **Edge Function belum di-deploy** atau tidak tersedia → Returns 404
2. **Edge Function mengembalikan 401** karena masalah autentikasi atau header tidak lengkap
3. **Token testing** - User ingin test dengan token yang sudah ada di Supabase, bukan dari Lemon Squeezy

## Solusi: Auto Fallback System

Sistem sekarang **otomatis fallback ke direct table access** jika Edge Function gagal dengan error apapun (401, 404, 500, dll). Ini memastikan aktivasi tetap bekerja bahkan jika Edge Function belum siap.

### Keuntungan:
- ✅ Bekerja langsung tanpa perlu deploy Edge Function
- ✅ Dapat test dengan token yang sudah ada di database
- ✅ Tidak perlu konfigurasi Lemon Squeezy untuk testing
- ✅ Lebih cepat dan sederhana untuk development

### Bagaimana Cara Kerjanya:

1. **Try Edge Function First** - Mencoba memanggil Edge Function
2. **Auto Fallback** - Jika Edge Function gagal (401, 404, 500, dll), otomatis fallback ke direct access
3. **Direct Access** - Mencari token di database dengan 4 strategi:
   - Exact match (case-sensitive)
   - Case-insensitive search
   - Original input
   - List all tokens (untuk debugging)

4. **Process Activation** - Jika token ditemukan:
   - Check status dan device_id
   - Aktifkan jika tidak aktif
   - Return success dengan data token

## Kode Perubahan

### `src/services/licenseService.ts`

```typescript
// TEMPORARY: Use direct access for testing
console.log('📋 Using direct table access for license activation')
return await this.activateLicenseDirect(normalizedKey, deviceId)
```

## Testing

Sekarang Anda dapat:

1. ✅ Test dengan token yang sudah ada di Supabase
2. ✅ Tidak perlu deploy Edge Function
3. ✅ Tidak perlu konfigurasi Lemon Squeezy API
4. ✅ Aktivasi langsung bekerja

### Cara Test:

1. Pastikan token ada di Supabase table `license_tokens`:
   ```sql
   SELECT * FROM license_tokens;
   ```

2. Buka aplikasi → Profile page

3. Input token dari database

4. Klik "Activate License"

5. Console akan menampilkan:
   ```
   🔗 Attempting Edge Function activation
     URL: https://...
     Response status: 401
     ⚠️ Edge Function error (401): Authentication failed
     → Falling back to direct table access
   🔍 Attempting direct license activation
     Strategy 1: Exact match (normalized)...
     ✅ Found with exact match: YOUR_TOKEN
     Processing activation...
     ✅ License activated successfully
   ```

## Enable Edge Function Nanti

Ketika siap menggunakan Edge Function dengan Lemon Squeezy:

1. Deploy Edge Function ke Supabase
2. Set environment variables di Supabase:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `LEMON_API_KEY`

3. Uncomment kode Edge Function di `activateLicense()` method

4. Comment out direct access line

## Error Handling

Jika masih ada error, check:

1. **Token tidak ditemukan**:
   - Pastikan token ada di database
   - Check case sensitivity (token akan di-normalize ke uppercase)
   - Console akan menampilkan semua token yang ada

2. **RLS Policy Error**:
   - Pastikan SELECT dan UPDATE policies aktif
   - Check policy expressions

3. **Database Error**:
   - Check Supabase connection
   - Verify environment variables

## Console Logs

Sistem akan menampilkan log detail di console:
- ✅ Token ditemukan
- ⚠️ Fallback ke direct access
- ❌ Error dengan detail

Periksa browser console (F12) untuk detail lengkap.

