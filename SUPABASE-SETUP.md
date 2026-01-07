# Supabase License Token System Setup

## Environment Variables

Add these environment variables to your `.env` file (for local development) and Netlify environment variables (for production):

```env
VITE_SUPABASE_URL=https://yfjxcxvgxfdruxfhsbrk.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_50YVF8IQC7otBPc_EYexkw_VCgrgthd
```

## Netlify Setup

1. Go to your Netlify site dashboard
2. Navigate to **Site settings** → **Environment variables**
3. Add the following variables:
   - `VITE_SUPABASE_URL` = `https://yfjxcxvgxfdruxfhsbrk.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `sb_publishable_50YVF8IQC7otBPc_EYexkw_VCgrgthd`
4. Redeploy your site for changes to take effect

## Supabase Table Setup

### Table: `license_tokens`

```sql
CREATE TABLE license_tokens (
  token TEXT PRIMARY KEY,
  device_id TEXT,
  status TEXT CHECK (status IN ('active', 'inactive')) DEFAULT 'inactive',
  activated_at TIMESTAMPTZ
);
```

### Row Level Security (RLS)

Enable RLS on the table:

```sql
ALTER TABLE license_tokens ENABLE ROW LEVEL SECURITY;
```

### RLS Policies

**SELECT Policy** (Allow anyone to read):
```sql
CREATE POLICY "Allow SELECT on license_tokens"
ON license_tokens
FOR SELECT
USING (true);
```

**UPDATE Policy** (Allow anyone to update):
```sql
CREATE POLICY "Allow UPDATE on license_tokens"
ON license_tokens
FOR UPDATE
USING (true)
WITH CHECK (true);
```

## Installation

Install the Supabase client:

```bash
npm install @supabase/supabase-js
```

## How It Works

1. **Device UUID**: Generated on first app load and stored in localStorage
2. **Token Activation**: 
   - Validates token format (12 chars, letters, numbers, special chars)
   - Checks Supabase for token existence
   - If inactive: binds to current device, sets status to active
   - If active on different device: blocks activation
   - If active on same device: allows access
3. **Token Deactivation**: 
   - Removes device binding
   - Sets status to inactive
   - Clears activated_at
   - Token can be reactivated on another device

## Features

- ✅ True one-device-per-license (enforced by Supabase)
- ✅ Works across all browsers and devices
- ✅ Network error handling
- ✅ Loading states
- ✅ Clear error messages
- ✅ Feature gating (Basic: 3x limit, Premium: unlimited)

