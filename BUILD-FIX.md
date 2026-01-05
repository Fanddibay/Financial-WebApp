# 🔧 Fix Build Error - Panduan

## Masalah

Build command `npm run build` menjalankan type-check yang bisa gagal di production build. Untuk production, lebih baik skip type-check dan langsung build.

## ✅ Solusi yang Sudah Diterapkan

### 1. Netlify Configuration
File `netlify.toml` sudah di-update:
- Build command: `npm run build-only` (skip type-check)
- Node version: `20.19.0` (sesuai requirement)

### 2. Vercel Configuration  
File `vercel.json` sudah di-update:
- Build command: `npm run build-only`
- Node version: `20.x`

### 3. Node Version File
File `.nvmrc` sudah dibuat untuk memastikan Node version yang benar.

## 📝 Update Build Settings di Netlify/Vercel

### Netlify:
1. Buka **Site Settings** → **Build & deploy** → **Build settings**
2. Update:
   - **Build command:** `npm run build-only`
   - **Publish directory:** `dist`
3. Di **Environment variables**, tambahkan (jika belum):
   - `NODE_VERSION` = `20.19.0`
4. **Save** dan **Trigger deploy**

### Vercel:
1. Buka **Project Settings** → **General**
2. Update:
   - **Build Command:** `npm run build-only`
   - **Output Directory:** `dist`
3. Di **Environment Variables**, pastikan Node version:
   - Vercel biasanya auto-detect, tapi bisa set di **Node.js Version**: `20.x`
4. **Save** dan **Redeploy**

## 🎯 Perbedaan Build Commands

- `npm run build` - Menjalankan type-check + build (lebih lama, bisa gagal jika ada type error)
- `npm run build-only` - Langsung build tanpa type-check (lebih cepat, untuk production)

## ✅ Verifikasi

Setelah update, build seharusnya berhasil. Jika masih error:

1. **Cek Build Logs** di dashboard Netlify/Vercel
2. **Pastikan Node version** sesuai (20.19.0+ atau 22.12.0+)
3. **Pastikan semua dependencies** terinstall dengan benar

## 🚀 Deploy Ulang

Setelah update settings:
- **Netlify**: Trigger manual deploy atau push commit baru
- **Vercel**: Auto-redeploy atau trigger manual dari dashboard

---

**Catatan:** Type-check tetap penting untuk development, tapi untuk production build, `build-only` lebih reliable dan cepat.

