#!/bin/bash

# Script untuk push ke GitHub dengan branch Finance-WebApp
# Pastikan sudah set git config terlebih dahulu jika belum

echo "🚀 Memulai proses push ke GitHub..."

# Cek apakah sudah ada git repository
if [ ! -d ".git" ]; then
    echo "📦 Inisialisasi git repository..."
    git init
fi

# Cek apakah sudah ada remote
if ! git remote | grep -q "origin"; then
    echo "⚠️  Belum ada remote 'origin'"
    echo "📝 Silakan masukkan URL GitHub repository Anda:"
    read -r GITHUB_URL
    git remote add origin "$GITHUB_URL"
fi

# Buat branch Finance-WebApp
echo "🌿 Membuat branch Finance-WebApp..."
git checkout -b Finance-WebApp 2>/dev/null || git checkout Finance-WebApp

# Add semua file
echo "📝 Menambahkan file ke staging..."
git add .

# Commit
echo "💾 Membuat commit..."
git commit -m "feat: Financial Tracker PWA with PWA Install feature

- Add PWA install feature in Settings page
- Clean UI/UX for install button
- Support offline mode
- Service worker configuration
- Ready for deployment"

# Push ke GitHub
echo "⬆️  Push ke GitHub..."
git push -u origin Finance-WebApp

echo "✅ Selesai! Code sudah di-push ke branch Finance-WebApp"
echo "🔗 Cek di GitHub: $(git remote get-url origin | sed 's/\.git$//')/tree/Finance-WebApp"

