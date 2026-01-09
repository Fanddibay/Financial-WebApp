# License Activation Fix - Direct Access Mode

## Perubahan yang Dilakukan

### 1. **Skip Edge Function Sementara**
- Sistem sekarang langsung menggunakan **direct table access**
- Edge Function di-disable sementara sampai dikonfigurasi dengan benar
- Ini memastikan aktivasi bekerja tanpa bergantung pada Edge Function

### 2. **Enhanced Logging**
- Menambahkan logging detail di setiap langkah
- Console log menunjukkan strategi pencarian yang digunakan
- Menampilkan semua token yang ada di database untuk debugging

### 3. **Multiple Search Strategies**
Sistem mencoba 4 strategi pencarian:
1. **Exact match** - Pencarian case-sensitive dengan normalized key
2. **Case-insensitive** - Menggunakan `.ilike()` untuk case-insensitive search
3. **Original input** - Tanpa normalisasi (trim saja)
4. **List all tokens** - Menampilkan semua token di database untuk debugging

### 4. **Error Messages yang Lebih Detail**
- Error message sekarang lebih spesifik
- Menunjukkan token yang dicari
- Menampilkan error dari database jika ada

## Cara Debugging

### 1. Buka Browser Console (F12)

Saat mencoba aktivasi token, console akan menampilkan:

```
🔍 Attempting direct license activation
  - Searching for token: A1B2C3D4E5F!
  - Device ID: xxx-xxx-xxx
  Strategy 1: Exact match (normalized)...
  ✅ Found with exact match: A1B2C3D4E5F!
  Processing activation for token: A1B2C3D4E5F!
```

### 2. Jika Token Tidak Ditemukan

Console akan menunjukkan:
- Strategi pencarian yang sudah dicoba
- Token yang dicari
- Semua token yang ada di database (jika strategy 4 dijalankan)

### 3. Check Database

Pastikan token ada di Supabase:
```sql
-- Check semua token
SELECT token, status, device_id FROM license_tokens;

-- Check token spesifik (case-insensitive)
SELECT * FROM license_tokens WHERE token ILIKE 'a1b2c3d4e5f!';
```

## Troubleshooting

### Issue: "Token not found in database"

**Solution:**
1. Check browser console untuk melihat token yang dicari
2. Verify token ada di Supabase table `license_tokens`
3. Check case sensitivity - token di DB mungkin lowercase
4. System akan otomatis coba case-insensitive search

### Issue: "Database error"

**Possible Causes:**
- RLS policies tidak aktif
- Supabase connection error
- Table tidak ada

**Solution:**
1. Check RLS policies di Supabase
2. Verify environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
3. Check Supabase dashboard untuk table `license_tokens`

### Issue: "Permission denied"

**Solution:**
1. Enable RLS policies:
   - SELECT: `USING (true)`
   - UPDATE: `USING (true) WITH CHECK (true)`
2. Check service role key if using Edge Function

## Testing

1. **Test dengan token yang ada:**
   - Buka Profile page
   - Input salah satu token dari database
   - Check console untuk log detail

2. **Test dengan token yang tidak ada:**
   - Input token random
   - System akan menunjukkan error dan list semua token di database

3. **Test case sensitivity:**
   - Input token dengan case berbeda
   - System akan otomatis coba case-insensitive search

## Next Steps

Setelah direct access bekerja dengan baik:
1. Enable Edge Function jika diperlukan
2. Configure Lemon Squeezy API (jika menggunakan)
3. Test Edge Function dengan proper error handling

