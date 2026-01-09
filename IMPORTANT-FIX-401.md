# IMPORTANT: Fix 401 Error - Solution

## Masalah 401 "Invalid JWT"

**Penyebab:**
- Supabase Edge Functions **SECARA OTOMATIS** memvalidasi JWT di **platform level**
- Jika `Authorization` header berisi JWT yang tidak valid, Supabase return 401 **SEBELUM** kode Edge Function kita dieksekusi
- Ini adalah **security feature** dari Supabase yang **TIDAK BISA** di-bypass di level code

**Mengapa JWT tidak valid:**
1. `VITE_SUPABASE_ANON_KEY` salah atau tidak match dengan project
2. Anon key sudah expired atau di-revoke
3. Format JWT salah

## Solusi: Fix JWT Authentication

### Step 1: Verify Anon Key

1. **Buka Supabase Dashboard:**
   - https://supabase.com/dashboard
   - Pilih project Anda

2. **Check API Keys:**
   - Project Settings → API
   - Copy **anon/public** key (bukan service_role key)
   - Key format: `sb_publishable_...` atau `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

3. **Update `.env` file:**
   ```env
   VITE_SUPABASE_URL=https://yfjxcxvgxfdruxfhsbrk.supabase.co
   VITE_SUPABASE_ANON_KEY=<paste_anon_key_here>
   ```

4. **Restart dev server:**
   ```bash
   # Stop current server (Ctrl+C)
   npm run dev
   ```

### Step 2: Verify Headers are Correct

Frontend sudah mengirim header dengan benar:
```typescript
headers: {
  Authorization: `Bearer ${supabaseAnonKey}`,
  apikey: supabaseAnonKey, // Required!
}
```

### Step 3: Test

1. Buka browser console (F12)
2. Coba aktivasi license
3. Check console log:
   - Jika 401 → JWT masih tidak valid, check anon key
   - Jika fallback ke direct access → OK, sistem bekerja dengan direct access

## Fallback Solution: Direct Access

Jika Edge Function tetap return 401:

✅ **Sistem sudah otomatis fallback ke direct access**
✅ **Direct access menggunakan anon key yang valid**
✅ **Aktivasi tetap bekerja meskipun Edge Function error**

## Testing Lemon Squeezy License

Untuk menggunakan license Lemon Squeezy (`E7C4B885-2F81-4836-ABB6-EE39A48FF428`):

**Option 1: Via Edge Function (Setelah fix 401)**
1. Fix anon key (Step 1 di atas)
2. Deploy Edge Function dengan `LEMON_API_KEY`
3. Input license key Lemon Squeezy
4. Edge Function akan validate dan auto-insert ke database

**Option 2: Manual Insert ke Database (Untuk Testing)**
1. Buka Supabase Dashboard → SQL Editor
2. Run query:
   ```sql
   INSERT INTO license_tokens (token, status) VALUES 
   ('E7C4B885-2F81-4836-ABB6-EE39A48FF428', 'inactive');
   ```
3. Input license key di aplikasi
4. Sistem akan menggunakan direct access dan menemukan token

## Current Status

Sistem sekarang:
- ✅ Auto fallback ke direct access jika 401
- ✅ Support multiple search strategies
- ✅ Support Lemon Squeezy format (dash) dan format lama
- ✅ Detail logging untuk debugging

**Aktivasi tetap bekerja meskipun Edge Function return 401** karena auto fallback.

## Next Steps

1. **Fix anon key** untuk menghilangkan 401 error
2. **Test dengan token yang sudah ada di database** (direct access)
3. **Deploy Edge Function** untuk support Lemon Squeezy validation

