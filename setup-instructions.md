# Setup Instructions - License Token System

## Step 1: Install Package

Run this command in your terminal:
```bash
npm install @supabase/supabase-js
```

## Step 2: Environment Variables

✅ **Already created**: `.env` file with Supabase credentials

For **Netlify**, add these environment variables:
1. Go to Netlify Dashboard → Your Site → Site settings → Environment variables
2. Add:
   - `VITE_SUPABASE_URL` = `https://yfjxcxvgxfdruxfhsbrk.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `sb_publishable_50YVF8IQC7otBPc_EYexkw_VCgrgthd`
3. Redeploy your site

## Step 3: Setup Supabase Table

### Option A: Using SQL Editor (Recommended)

1. Go to Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor**
4. Copy and paste the contents of `supabase-setup.sql`
5. Click **Run**

This will:
- Create the `license_tokens` table
- Enable Row Level Security (RLS)
- Create SELECT and UPDATE policies
- Insert 5 initial tokens

### Option B: Using Supabase Dashboard

1. Go to **Table Editor**
2. Click **New Table**
3. Name: `license_tokens`
4. Add columns:
   - `token` (text, primary key)
   - `device_id` (text, nullable)
   - `status` (text, default: 'inactive')
   - `activated_at` (timestamptz, nullable)
5. Enable RLS
6. Create policies (see `supabase-setup.sql`)

## Step 4: Insert Initial Tokens

The SQL script in `supabase-setup.sql` already includes 5 tokens:
- `A1b2C3d4E5f!`
- `X9y8Z7w6V5u@`
- `M3n2O1p0Q9r#`
- `S7t6U5v4W3x$`
- `K1l2M3n4O5p%`

If you need to add more manually:
```sql
INSERT INTO license_tokens (token, status) VALUES 
('YOUR_TOKEN_HERE', 'inactive');
```

## Step 5: Verify Setup

1. Start your dev server: `npm run dev`
2. Go to Profile page
3. Try activating one of the tokens above
4. Verify it works!

## Troubleshooting

### "Failed to validate license token"
- Check if token exists in Supabase table
- Verify RLS policies are set correctly
- Check browser console for detailed errors

### "Network error"
- Verify environment variables are set correctly
- Check Supabase project is active
- Verify API key is correct

### "This license is already active on another device"
- This is expected behavior - token is working correctly!
- Deactivate on the other device first, then activate here

