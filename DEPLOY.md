# Panduan Deployment

Panduan lengkap untuk deploy aplikasi Financial Tracker PWA ke berbagai platform.

## 📋 Prasyarat

1. **GitHub Account** - Untuk menyimpan kode
2. **Node.js** - Versi 20.19.0 atau 22.12.0+ (sudah terinstall)
3. **Git** - Untuk version control

## 🚀 Opsi 1: Deploy ke Vercel (Paling Mudah & Recommended)

Vercel adalah platform yang sangat mudah digunakan dan gratis untuk project personal.

### Langkah-langkah:

#### 1. Push Code ke GitHub

```bash
# Jika belum ada git repository
git init
git add .
git commit -m "Initial commit"

# Buat repository baru di GitHub, lalu:
git remote add origin https://github.com/USERNAME/my-vue-app.git
git branch -M main
git push -u origin main
```

#### 2. Deploy ke Vercel

1. **Kunjungi [vercel.com](https://vercel.com)** dan login dengan GitHub
2. **Klik "Add New Project"**
3. **Import Git Repository** - Pilih repository `my-vue-app`
4. **Configure Project:**
   - Framework Preset: **Vite** (otomatis terdeteksi)
   - Build Command: `npm run build` (sudah otomatis)
   - Output Directory: `dist` (sudah otomatis)
   - Install Command: `npm install` (sudah otomatis)
5. **Environment Variables** (Opsional):
   - Jika menggunakan OpenAI API, tambahkan:
     - Key: `VITE_OPENAI_API_KEY`
     - Value: `your-api-key-here`
6. **Klik "Deploy"**

#### 3. Selesai! 🎉

Aplikasi akan otomatis di-deploy dan mendapatkan URL seperti:
`https://my-vue-app.vercel.app`

**Keuntungan Vercel:**
- ✅ Auto-deploy dari GitHub (setiap push)
- ✅ HTTPS gratis
- ✅ CDN global
- ✅ PWA support penuh
- ✅ Gratis untuk personal project

---

## 🌐 Opsi 2: Deploy ke Netlify

Netlify juga sangat mudah dan gratis.

### Langkah-langkah:

#### 1. Push Code ke GitHub (sama seperti Vercel)

#### 2. Deploy ke Netlify

1. **Kunjungi [netlify.com](https://netlify.com)** dan login dengan GitHub
2. **Klik "Add new site" → "Import an existing project"**
3. **Pilih repository** `my-vue-app`
4. **Configure Build Settings:**
   - Build command: `npm run build`
   - Publish directory: `dist`
5. **Environment Variables** (Opsional):
   - Klik "Show advanced" → "New variable"
   - Key: `VITE_OPENAI_API_KEY`
   - Value: `your-api-key-here`
6. **Klik "Deploy site"**

#### 3. Selesai! 🎉

Aplikasi akan mendapatkan URL seperti:
`https://my-vue-app.netlify.app`

**Keuntungan Netlify:**
- ✅ Auto-deploy dari GitHub
- ✅ HTTPS gratis
- ✅ CDN global
- ✅ PWA support penuh
- ✅ Gratis untuk personal project

---

## 📦 Opsi 3: Deploy ke Cloudflare Pages

Cloudflare Pages juga gratis dan sangat cepat.

### Langkah-langkah:

#### 1. Push Code ke GitHub

#### 2. Deploy ke Cloudflare Pages

1. **Kunjungi [dash.cloudflare.com](https://dash.cloudflare.com)**
2. **Pergi ke "Pages" → "Create a project"**
3. **Connect to Git** → Pilih GitHub → Pilih repository
4. **Configure Build Settings:**
   - Framework preset: **Vite**
   - Build command: `npm run build`
   - Build output directory: `dist`
5. **Environment Variables** (Opsional):
   - Tambahkan `VITE_OPENAI_API_KEY` jika perlu
6. **Klik "Save and Deploy"**

#### 3. Selesai! 🎉

Aplikasi akan mendapatkan URL seperti:
`https://my-vue-app.pages.dev`

---

## 🔧 Build Lokal (Testing Sebelum Deploy)

Sebelum deploy, pastikan build berhasil:

```bash
# Install dependencies
npm install

# Build production
npm run build

# Preview build lokal
npm run preview
```

Buka `http://localhost:4173` untuk melihat hasil build.

---

## ⚙️ Environment Variables

Jika menggunakan OpenAI API, tambahkan environment variable:

### Vercel:
1. Project Settings → Environment Variables
2. Tambahkan `VITE_OPENAI_API_KEY` dengan value API key Anda

### Netlify:
1. Site Settings → Environment Variables
2. Tambahkan `VITE_OPENAI_API_KEY` dengan value API key Anda

### Cloudflare Pages:
1. Settings → Environment Variables
2. Tambahkan `VITE_OPENAI_API_KEY` dengan value API key Anda

**Catatan:** Setelah menambahkan environment variable, perlu **redeploy** aplikasi.

---

## 🎯 Setelah Deploy

### 1. Test PWA Installation
- Buka aplikasi di browser (Chrome/Edge recommended)
- Cek apakah tombol "Install App" muncul di Settings
- Test install PWA

### 2. Test Offline Mode
- Install PWA
- Matikan internet
- Buka aplikasi - harusnya masih bisa digunakan

### 3. Test Service Worker
- Buka DevTools → Application → Service Workers
- Pastikan service worker terdaftar dan aktif

---

## 🐛 Troubleshooting

### Build Error
```bash
# Pastikan Node.js version sesuai
node --version  # Harus 20.19.0+ atau 22.12.0+

# Clear cache dan rebuild
rm -rf node_modules dist
npm install
npm run build
```

### PWA Tidak Bisa Install
- Pastikan aplikasi di-deploy dengan HTTPS
- Cek manifest.webmanifest di DevTools → Application → Manifest
- Pastikan service worker aktif

### Service Worker Error
- Pastikan file `sw.js` bisa diakses
- Cek console untuk error
- Pastikan headers `Service-Worker-Allowed: /` sudah di-set

---

## 📝 Tips

1. **Custom Domain**: Semua platform di atas mendukung custom domain gratis
2. **Auto Deploy**: Setiap push ke GitHub akan otomatis trigger deployment
3. **Preview Deployments**: Vercel dan Netlify membuat preview untuk setiap PR
4. **Analytics**: Tambahkan analytics (Google Analytics, Plausible, dll) jika perlu

---

## 🎉 Selamat!

Aplikasi Financial Tracker PWA Anda sudah siap digunakan secara online!

Jika ada pertanyaan atau masalah, silakan buat issue di GitHub repository.

