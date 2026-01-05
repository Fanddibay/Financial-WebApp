# Push ke GitHub - Branch Finance-WebApp

## Cara 1: Menggunakan Script (Paling Mudah)

Jalankan script yang sudah saya buat:

```bash
./deploy-to-github.sh
```

Script akan meminta URL GitHub repository Anda jika belum ada remote.

## Cara 2: Manual Commands

Jika Anda sudah punya remote GitHub, jalankan perintah berikut:

```bash
# 1. Buat branch Finance-WebApp
git checkout -b Finance-WebApp

# 2. Add semua file
git add .

# 3. Commit
git commit -m "feat: Financial Tracker PWA with PWA Install feature

- Add PWA install feature in Settings page
- Clean UI/UX for install button
- Support offline mode
- Service worker configuration
- Ready for deployment"

# 4. Push ke GitHub
git push -u origin Finance-WebApp
```

## Jika Belum Ada Remote

Jika belum ada remote GitHub, tambahkan dulu:

```bash
# Ganti USERNAME dan REPO-NAME dengan milik Anda
git remote add origin https://github.com/USERNAME/REPO-NAME.git

# Atau jika menggunakan SSH
git remote add origin git@github.com:USERNAME/REPO-NAME.git
```

## Set Git Config (Jika Belum)

```bash
git config user.name "Your Name"
git config user.email "your.email@example.com"
```

---

**Catatan:** Saya sudah membuat file konfigurasi deployment (vercel.json, netlify.toml) yang akan ikut ter-push juga.

