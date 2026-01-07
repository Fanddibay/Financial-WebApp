# 🚀 Supabase License Token System - Quick Reference

## ✅ Status Setup

- ✅ Package `@supabase/supabase-js` terinstall
- ✅ Code implementation selesai
- ✅ SQL script siap (`supabase-setup.sql`)
- ✅ 5 token sudah disiapkan di SQL script
- ⚠️  **Action Required:** Setup Supabase table (lihat Step 2)

## 🎯 Quick Setup (3 Langkah)

### Step 1: Environment Variables

**Local (.env file):**
```env
VITE_SUPABASE_URL=https://yfjxcxvgxfdruxfhsbrk.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_50YVF8IQC7otBPc_EYexkw_VCgrgthd
```

**Netlify:**
- Site settings → Environment variables
- Add kedua variable di atas
- Redeploy

### Step 2: Setup Supabase Table ⚠️ **PENTING**

1. Buka: https://supabase.com/dashboard
2. Pilih project → **SQL Editor**
3. Copy-paste isi file `supabase-setup.sql`
4. Klik **Run**

✅ Script akan:
- Buat table `license_tokens`
- Enable RLS
- Buat policies
- Insert 5 token

### Step 3: Test

```bash
npm run dev
```

Buka Profile page → Token & License → Test dengan token: `A1b2C3d4E5f!`

## 🔑 5 Token Awal

1. `A1b2C3d4E5f!`
2. `X9y8Z7w6V5u@`
3. `M3n2O1p0Q9r#`
4. `S7t6U5v4W3x$`
5. `K1l2M3n4O5p%`

## 📁 File Penting

- `supabase-setup.sql` - **Jalankan ini di Supabase SQL Editor**
- `QUICK-START.md` - Panduan lengkap
- `SETUP-COMPLETE.md` - Checklist setup
- `src/services/supabase.ts` - Supabase client
- `src/services/licenseService.ts` - License service

## ✨ Fitur

- ✅ True one-device-per-license
- ✅ Cross-browser support
- ✅ Network error handling
- ✅ Feature gating (Basic 3x, Premium unlimited)

---

**Next:** Jalankan `supabase-setup.sql` di Supabase SQL Editor!

