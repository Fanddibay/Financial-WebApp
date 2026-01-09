# Debug License Activation - Guide

## Troubleshooting Steps

### 1. Check Browser Console

Buka browser console (F12) dan coba aktivasi license. Cari pesan berikut:

**Success messages:**
- `"Attempting Edge Function activation:"` - Mencoba Edge Function
- `"Edge Function activation successful"` - Edge Function berhasil
- `"Found token with exact match:"` - Token ditemukan dengan exact match
- `"License activated successfully:"` - Aktivasi berhasil

**Fallback messages:**
- `"Edge Function unavailable, using direct table access"` - Fallback ke direct access
- `"Edge Function returned 404/500, falling back to direct table access"` - Edge Function error, fallback

**Error messages:**
- `"Token not found in database"` - Token tidak ada di database
- `"Permission denied. Please check your RLS policies"` - Masalah RLS
- `"Database error:"` - Error dari Supabase

### 2. Check Token in Database

Pastikan token ada di Supabase table `license_tokens`:

1. Buka Supabase Dashboard
2. Table Editor → `license_tokens`
3. Check apakah token yang Anda coba ada di sana
4. Check format token (case-sensitive atau tidak)

### 3. Check RLS Policies

Pastikan RLS policies sudah di-set dengan benar:

1. Buka Supabase Dashboard
2. Table Editor → `license_tokens` → Policies
3. Pastikan ada:
   - **SELECT policy** - Allow SELECT for all (USING: true)
   - **UPDATE policy** - Allow UPDATE for all (USING: true, WITH CHECK: true)

### 4. Check Environment Variables

Pastikan environment variables sudah di-set:

```bash
# Check .env file
cat .env

# Should contain:
VITE_SUPABASE_URL=https://yfjxcxvgxfdruxfhsbrk.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_50YVF8IQC7otBPc_EYexkw_VCgrgthd
```

### 5. Test Direct Query

Test query langsung ke Supabase untuk memastikan token ada:

```sql
-- Di Supabase SQL Editor
SELECT * FROM license_tokens WHERE token = 'YOUR_TOKEN_HERE';
-- Atau case-insensitive:
SELECT * FROM license_tokens WHERE token ILIKE 'your_token_here';
```

### 6. Common Issues

#### Issue: "Invalid license key"
**Cause:** Token tidak ditemukan di database
**Solution:** 
- Pastikan token ada di table `license_tokens`
- Check case sensitivity (token di DB mungkin lowercase)
- System akan otomatis coba case-insensitive search

#### Issue: "Permission denied"
**Cause:** RLS policies tidak mengizinkan UPDATE
**Solution:**
- Check UPDATE policy di Supabase
- Pastikan policy menggunakan `WITH CHECK (true)`

#### Issue: "Edge Function unavailable"
**Cause:** Edge Function tidak di-deploy atau error
**Solution:**
- System otomatis fallback ke direct table access
- Jika masih error, check RLS policies dan token di database

#### Issue: "License already active on another device"
**Cause:** Token sudah aktif di device lain
**Solution:**
- Deactivate dulu di device tersebut
- Atau update manual di database: `UPDATE license_tokens SET device_id = NULL, status = 'inactive' WHERE token = 'YOUR_TOKEN';`

### 7. Manual Database Update (Emergency)

Jika perlu reset token manual:

```sql
-- Reset token ke inactive
UPDATE license_tokens 
SET device_id = NULL, status = 'inactive', activated_at = NULL 
WHERE token = 'YOUR_TOKEN';

-- Check token status
SELECT token, status, device_id, activated_at 
FROM license_tokens 
WHERE token = 'YOUR_TOKEN';
```

## Expected Behavior

1. User input license key
2. System normalize key (uppercase, trim)
3. Try Edge Function first
4. If Edge Function fails → Fallback to direct table access
5. Search token in database (exact match, then case-insensitive)
6. Activate token if found and inactive
7. Save token to localStorage

## Success Indicators

✅ License activation berhasil jika:
- Browser console menunjukkan "License activated successfully"
- UI menampilkan "License Status: Active"
- Token tersimpan di localStorage
- Feature premium dapat digunakan

