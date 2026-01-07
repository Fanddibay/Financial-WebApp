# 🚀 Quick Start Guide - License Token System

## ✅ Step 1: Package Installed
✅ `@supabase/supabase-js` sudah terinstall

## ✅ Step 2: Environment Variables

**Local Development:**
File `.env` sudah dibuat dengan credentials Supabase.

**Netlify Production:**
1. Buka Netlify Dashboard
2. Pilih site Anda → **Site settings** → **Environment variables**
3. Tambahkan:
   - `VITE_SUPABASE_URL` = `https://yfjxcxvgxfdruxfhsbrk.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `sb_publishable_50YVF8IQC7otBPc_EYexkw_VCgrgthd`
4. **Redeploy** site Anda

## 📋 Step 3: Setup Supabase Table

### Cara 1: Menggunakan SQL Editor (Paling Mudah)

1. Buka **Supabase Dashboard**: https://supabase.com/dashboard
2. Pilih project Anda
3. Klik **SQL Editor** di sidebar kiri
4. Klik **New query**
5. Copy-paste seluruh isi file `supabase-setup.sql`
6. Klik **Run** (atau tekan Cmd/Ctrl + Enter)

Script ini akan:
- ✅ Membuat table `license_tokens`
- ✅ Enable Row Level Security (RLS)
- ✅ Membuat policies (SELECT & UPDATE)
- ✅ Insert 5 token awal

### Cara 2: Manual Setup

Jika SQL script tidak berjalan, setup manual:

1. **Buat Table:**
   - Buka **Table Editor**
   - Klik **New Table**
   - Nama: `license_tokens`
   - Tambahkan kolom:
     - `token` (text, primary key, required)
     - `device_id` (text, nullable)
     - `status` (text, default: 'inactive')
     - `activated_at` (timestamptz, nullable)

2. **Enable RLS:**
   - Di table `license_tokens`, klik **Policies**
   - Enable **Row Level Security**

3. **Buat Policies:**
   - **SELECT Policy:**
     - Name: `Allow SELECT on license_tokens`
     - Allowed operation: `SELECT`
     - USING expression: `true`
   - **UPDATE Policy:**
     - Name: `Allow UPDATE on license_tokens`
     - Allowed operation: `UPDATE`
     - USING expression: `true`
     - WITH CHECK expression: `true`

4. **Insert Tokens:**
   - Buka **SQL Editor**
   - Run query ini:
   ```sql
   INSERT INTO license_tokens (token, status) VALUES 
   ('A1b2C3d4E5f!', 'inactive'),
   ('X9y8Z7w6V5u@', 'inactive'),
   ('M3n2O1p0Q9r#', 'inactive'),
   ('S7t6U5v4W3x$', 'inactive'),
   ('K1l2M3n4O5p%', 'inactive');
   ```

## 🎯 Step 4: Test Tokens

### 5 Token yang Tersedia:
1. `A1b2C3d4E5f!`
2. `X9y8Z7w6V5u@`
3. `M3n2O1p0Q9r#`
4. `S7t6U5v4W3x$`
5. `K1l2M3n4O5p%`

### Cara Test:
1. Jalankan dev server: `npm run dev`
2. Buka aplikasi di browser
3. Pergi ke **Profile** page
4. Scroll ke section **Token & License**
5. Paste salah satu token di atas
6. Klik **Verify Token**
7. Seharusnya muncul: "✅ License activated successfully!"

## ✅ Verification Checklist

- [ ] Package `@supabase/supabase-js` terinstall
- [ ] File `.env` ada dengan credentials yang benar
- [ ] Netlify environment variables sudah di-set (untuk production)
- [ ] Table `license_tokens` sudah dibuat di Supabase
- [ ] RLS sudah di-enable
- [ ] Policies (SELECT & UPDATE) sudah dibuat
- [ ] 5 token sudah di-insert ke database
- [ ] Test activation berhasil

## 🐛 Troubleshooting

### Error: "Missing Supabase environment variables"
- Pastikan file `.env` ada di root project
- Restart dev server setelah membuat `.env`
- Untuk production, pastikan Netlify env vars sudah di-set

### Error: "Invalid or inactive license token"
- Pastikan token ada di database Supabase
- Check di Supabase Table Editor apakah token sudah ter-insert
- Pastikan RLS policies sudah dibuat

### Error: "This license is already active on another device"
- ✅ Ini normal! Token sudah aktif di device lain
- Deactivate dulu di device tersebut, baru bisa aktif di device ini

### Error: "Network error"
- Check koneksi internet
- Verify Supabase URL dan API key benar
- Check Supabase project status (aktif/tidak)

## 📞 Support

Jika masih ada masalah:
1. Check browser console untuk error detail
2. Check Supabase logs di dashboard
3. Verify semua step di atas sudah dilakukan

