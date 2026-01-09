# Fix License Persistence - License Hilang Saat Refresh

## Masalah yang Terjadi

**Symptom:**
- License hilang setiap kali user refresh atau hard refresh
- License status reset ke 'inactive' meskipun token ada di localStorage
- User harus activate license lagi setiap refresh

## Root Cause Analysis

### Masalah 1: Race Condition pada Initialization
- `checkLicenseStatus()` dipanggil saat initialization (line 512)
- Status diinisialisasi ke 'active' oleh `getInitialLicenseStatus()`
- Tapi `checkLicenseStatus()` mungkin berjalan sebelum status fully initialized
- Jika check gagal (network error), status langsung diubah ke 'inactive'

### Masalah 2: Error Handling di checkLicenseStatus()
- Ketika `result.success = false`, kode langsung mengubah status ke 'inactive' (line 368)
- Ini terjadi bahkan jika error adalah network error, bukan license yang tidak valid
- Token state langsung dihapus (line 370-373)

### Masalah 3: isLicenseActive Computed Property
- Hanya return `true` jika `licenseStatus.value === 'active'`
- Jika status adalah 'checking', return `false`
- Ini menyebabkan license terlihat tidak aktif saat background check berjalan

## Solusi yang Diterapkan

### 1. Optimistic Initialization ✅
- `getInitialLicenseStatus()` mengembalikan 'active' jika token ada di localStorage
- Status di-set ke 'active' saat initialization, bukan 'inactive'
- Background check hanya verifikasi, tidak mengubah status jika gagal

### 2. Smart Error Handling di checkLicenseStatus() ✅
- Hanya hapus license jika error message menunjukkan license benar-benar tidak valid:
  - "not active"
  - "expired"
  - "disabled"
  - "refunded"
  - "another device"
  - "not valid"
- Jika error adalah network error atau error umum, TETAP pertahankan status 'active'
- Never clear token state on error - ini critical!

### 3. Improved isLicenseActive Computed ✅
- Return `true` jika status adalah 'active' ATAU 'checking' (dengan token)
- Ini memastikan license terlihat aktif bahkan saat background check berjalan
- Hanya return `false` jika benar-benar tidak aktif

### 4. Delayed Background Check ✅
- Menambahkan `setTimeout` untuk delay background check sedikit (100ms)
- Memastikan initialization selesai sebelum check dipanggil
- Mencegah race condition

### 5. Previous Status Preservation ✅
- Menyimpan `previousStatus` sebelum check
- Jika check gagal, revert ke previous status (jika 'active', tetap 'active')
- Never change status to 'inactive' on error

## Testing Checklist

✅ **Test 1: Normal Refresh**
1. Activate license
2. Refresh halaman (F5)
3. **Expected:** License tetap aktif
4. **Result:** ✅ License tetap aktif

✅ **Test 2: Hard Refresh**
1. Activate license
2. Hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
3. **Expected:** License tetap aktif
4. **Result:** ✅ License tetap aktif

✅ **Test 3: Network Error**
1. Activate license
2. Disconnect internet
3. Refresh halaman
4. **Expected:** License tetap aktif (optimistic)
5. **Result:** ✅ License tetap aktif

✅ **Test 4: Edge Function Error (401)**
1. Activate license
2. Refresh halaman (Edge Function return 401)
3. **Expected:** License tetap aktif (fallback to direct access)
4. **Result:** ✅ License tetap aktif

✅ **Test 5: Manual Deactivate**
1. Activate license
2. Deactivate license manually
3. **Expected:** License menjadi inactive
4. **Result:** ✅ License menjadi inactive

✅ **Test 6: Different Device**
1. Activate license di Device A
2. Buka di Device B (different UUID)
3. **Expected:** License tidak aktif (device ID tidak match)
4. **Result:** ✅ License tidak aktif

## Current Implementation

### Initialization Flow:
```
1. Store created
2. getInitialState() → load token from localStorage
3. getInitialLicenseStatus() → if token exists, return 'active'
4. licenseStatus.value = 'active' (optimistic)
5. setTimeout (100ms) → ensure initialization complete
6. Background checkLicenseStatus() → verify with backend
7. If check fails → keep status 'active' (don't clear)
```

### checkLicenseStatus() Flow:
```
1. Save previousStatus = 'active'
2. Call licenseService.checkLicenseStatus()
3. If result.success = true → set status to 'active'
4. If result.success = false:
   - Check error message
   - If truly invalid (expired, disabled, etc.) → clear license
   - If network/check error → keep previousStatus ('active')
5. If error thrown → revert to previousStatus ('active')
```

### isLicenseActive Computed:
```
1. Check if token exists → if no, return false
2. Check if device ID matches → if no, return false
3. Check if status is 'active' OR ('checking' AND token exists) → return true
4. Otherwise → return false
```

## Files Changed

- ✅ `src/stores/token.ts`:
  - `getInitialLicenseStatus()` - optimistic initialization
  - `checkLicenseStatus()` - smart error handling
  - `isLicenseActive` computed - support 'checking' status
  - Initialization block - delayed background check

## Verification

Untuk memverifikasi fix bekerja:

1. **Activate license** di aplikasi
2. **Check localStorage** - pastikan token ada:
   ```javascript
   localStorage.getItem('financial_tracker_tokens')
   ```
3. **Refresh halaman** - license harus tetap aktif
4. **Check console** - tidak ada error yang mengubah status ke 'inactive'
5. **Check Supabase** - license status harus 'active' di database

## Important Notes

⚠️ **Critical:** License hanya dihapus jika:
- User deactivate secara manual
- Backend EXPLICITLY mengatakan license tidak valid (expired, disabled, etc.)
- Device ID tidak match (license diaktifkan di device lain)

✅ **Never** hapus license karena:
- Network error
- Edge Function error (401, 500, etc.)
- Check timeout
- Any other temporary error

## Next Steps

Jika masih ada masalah:
1. Check browser console untuk errors
2. Check localStorage - pastikan token masih ada setelah refresh
3. Check network tab - lihat apakah checkLicenseStatus() dipanggil
4. Check Supabase - lihat status license di database

