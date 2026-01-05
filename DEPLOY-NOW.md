# 🚀 Deploy ke Vercel atau Netlify - Panduan Cepat

Repository Anda: `https://github.com/Fanddibay/Financial-WebApp.git`

---

## ⚡ Opsi 1: Deploy ke Vercel (Paling Mudah - Recommended)

### Cara 1: Via Website (Paling Mudah)

1. **Buka [vercel.com](https://vercel.com)** dan login dengan GitHub
2. **Klik "Add New Project"** (atau tombol "+ New Project")
3. **Import Git Repository:**
   - Pilih repository: `Fanddibay/Financial-WebApp`
   - Atau paste URL: `https://github.com/Fanddibay/Financial-WebApp.git`
4. **Configure Project:**
   - Framework Preset: **Vite** (otomatis terdeteksi)
   - Root Directory: `./` (biarkan default)
   - Build Command: `npm run build` ✅ (sudah otomatis)
   - Output Directory: `dist` ✅ (sudah otomatis)
   - Install Command: `npm install` ✅ (sudah otomatis)
5. **Environment Variables** (Opsional - jika pakai OpenAI):
   - Klik "Environment Variables"
   - Tambahkan:
     - Name: `VITE_OPENAI_API_KEY`
     - Value: `your-api-key-here`
6. **Klik "Deploy"** 🚀

**Selesai!** Aplikasi akan live dalam 1-2 menit di URL seperti:
`https://financial-webapp.vercel.app`

---

### Cara 2: Via Vercel CLI (Jika Sudah Install)

```bash
# Install Vercel CLI (jika belum)
npm i -g vercel

# Login ke Vercel
vercel login

# Deploy
vercel

# Follow prompts:
# - Set up and deploy? Y
# - Which scope? (pilih akun Anda)
# - Link to existing project? N
# - Project name? financial-webapp (atau biarkan default)
# - Directory? ./
# - Override settings? N

# Production deploy
vercel --prod
```

---

## 🌐 Opsi 2: Deploy ke Netlify

### Cara 1: Via Website

1. **Buka [netlify.com](https://netlify.com)** dan login dengan GitHub
2. **Klik "Add new site" → "Import an existing project"**
3. **Connect to Git:**
   - Pilih GitHub
   - Authorize Netlify jika diminta
   - Pilih repository: `Fanddibay/Financial-WebApp`
4. **Configure Build Settings:**
   - Branch to deploy: `Finance-WebApp` (atau `main`/`master`)
   - Build command: `npm run build` ✅
   - Publish directory: `dist` ✅
5. **Environment Variables** (Opsional):
   - Klik "Show advanced" → "New variable"
   - Key: `VITE_OPENAI_API_KEY`
   - Value: `your-api-key-here`
6. **Klik "Deploy site"** 🚀

**Selesai!** Aplikasi akan live di URL seperti:
`https://financial-webapp.netlify.app`

---

### Cara 2: Via Netlify CLI

```bash
# Install Netlify CLI (jika belum)
npm i -g netlify-cli

# Login ke Netlify
netlify login

# Deploy
netlify deploy --prod

# Follow prompts untuk link ke site
```

---

## ✅ Setelah Deploy

### 1. Test Aplikasi
- Buka URL yang diberikan (Vercel/Netlify)
- Pastikan aplikasi berjalan dengan baik
- Test semua fitur

### 2. Test PWA Installation
- Buka di browser Chrome/Edge
- Buka Settings page
- Cek apakah tombol "Instal Aplikasi" muncul
- Test install PWA

### 3. Test Offline Mode
- Install PWA
- Matikan internet
- Buka aplikasi - harusnya masih bisa digunakan

### 4. Custom Domain (Opsional)
- Vercel: Project Settings → Domains → Add Domain
- Netlify: Site Settings → Domain Management → Add Custom Domain

---

## 🔄 Auto-Deploy

Setelah setup pertama:
- **Setiap push ke GitHub** akan otomatis trigger deployment baru
- **Preview deployments** untuk setiap Pull Request
- **Production deployment** untuk push ke branch utama

---

## 🐛 Troubleshooting

### Build Error
```bash
# Pastikan Node.js version sesuai
node --version  # Harus 20.19.0+ atau 22.12.0+

# Test build lokal dulu
npm run build
```

### PWA Tidak Bisa Install
- Pastikan aplikasi di-deploy dengan HTTPS ✅ (otomatis)
- Cek manifest di DevTools → Application → Manifest
- Pastikan service worker aktif

### Service Worker Error
- Pastikan file `sw.js` bisa diakses
- Cek console untuk error
- Pastikan headers sudah di-set (sudah ada di config)

---

## 📊 Monitoring

- **Vercel**: Dashboard → Analytics (untuk melihat traffic)
- **Netlify**: Site Overview → Analytics

---

## 🎉 Selamat!

Aplikasi Financial Tracker PWA Anda sudah live!

**Repository:** https://github.com/Fanddibay/Financial-WebApp

Jika ada masalah, cek:
1. Build logs di dashboard Vercel/Netlify
2. Console browser untuk error
3. Network tab untuk service worker

