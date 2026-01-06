# 🔧 Tesseract.js Offline Support

## Masalah

Tesseract.js membutuhkan beberapa file yang biasanya di-download dari CDN saat runtime:
- Worker files (`worker.min.js`)
- Core WASM files (`tesseract-core.wasm.js`)
- Language data files (`eng.traineddata`)

File-file ini tidak akan tersedia saat offline jika tidak di-cache.

## ✅ Solusi yang Sudah Diterapkan

### 1. Service Worker Caching

Service worker sudah dikonfigurasi untuk cache:
- ✅ Tesseract.js worker files dari CDN
- ✅ WASM files
- ✅ Language data files (`.traineddata`)
- ✅ Semua CDN assets

### 2. Cache Strategy

Menggunakan `CacheFirst` strategy:
- File di-cache saat pertama kali di-download
- Saat offline, file diambil dari cache
- Cache berlaku 1 tahun (untuk stability)

## 🔄 Cara Kerja

1. **Pertama kali online:**
   - User scan receipt
   - Tesseract.js download worker files dari CDN
   - Service worker cache semua file
   - Scan berhasil

2. **Saat offline:**
   - User scan receipt
   - Tesseract.js request worker files
   - Service worker serve dari cache
   - Scan tetap berhasil! ✅

## ⚠️ Catatan Penting

### Pre-caching

Untuk hasil terbaik, **pastikan user sudah pernah scan sekali saat online** agar semua file ter-cache.

### Cache Size

Tesseract.js files cukup besar (~10-20MB):
- Worker files: ~2MB
- WASM core: ~5MB
- Language data (eng): ~5-10MB

Pastikan user memiliki storage yang cukup.

### Browser Support

Service worker caching bekerja di:
- ✅ Chrome/Edge (Android & Desktop)
- ✅ Firefox
- ✅ Safari (iOS 11.3+)

## 🧪 Testing Offline

1. **Buka aplikasi saat online**
2. **Scan receipt sekali** (untuk cache files)
3. **Matikan internet** (Airplane mode)
4. **Scan receipt lagi** - harusnya masih bekerja!

## 🐛 Troubleshooting

### Masih tidak bisa offline?

1. **Cek Service Worker:**
   - DevTools → Application → Service Workers
   - Pastikan service worker aktif

2. **Cek Cache:**
   - DevTools → Application → Cache Storage
   - Cek apakah ada `tesseract-cache`, `wasm-cache`, dll

3. **Clear & Re-cache:**
   - Unregister service worker
   - Clear cache
   - Reload dan scan lagi saat online

4. **Cek Console:**
   - Lihat apakah ada error saat load Tesseract.js
   - Cek network tab untuk failed requests

## 📝 Alternative: Bundle Lokal

Jika masih ada masalah, bisa bundle Tesseract.js secara lokal:

1. Download files manual
2. Simpan di `public/tesseract/`
3. Update code untuk load dari local path

Tapi dengan service worker caching, seharusnya sudah cukup!

---

**Status:** ✅ Tesseract.js offline support sudah dikonfigurasi via service worker caching.

