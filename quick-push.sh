#!/bin/bash

# Quick push script - Ganti GITHUB_URL dengan URL repository Anda
# Contoh: https://github.com/username/repo-name.git

echo "🔗 Menambahkan remote GitHub..."
echo "📝 Masukkan URL GitHub repository Anda:"
read -r GITHUB_URL

git remote add origin "$GITHUB_URL"

echo "⬆️  Push ke branch Finance-WebApp..."
git push -u origin Finance-WebApp

echo "✅ Selesai! Code sudah di-push ke GitHub"
echo "🔗 URL: $GITHUB_URL"

