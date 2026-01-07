-- Supabase License Tokens Table Setup
-- Run this SQL in your Supabase SQL Editor

-- Create license_tokens table
CREATE TABLE IF NOT EXISTS license_tokens (
  token TEXT PRIMARY KEY,
  device_id TEXT,
  status TEXT CHECK (status IN ('active', 'inactive')) DEFAULT 'inactive',
  activated_at TIMESTAMPTZ
);

-- Enable Row Level Security
ALTER TABLE license_tokens ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for clean setup)
DROP POLICY IF EXISTS "Allow SELECT on license_tokens" ON license_tokens;
DROP POLICY IF EXISTS "Allow UPDATE on license_tokens" ON license_tokens;

-- Create SELECT policy (allow anyone to read)
CREATE POLICY "Allow SELECT on license_tokens"
ON license_tokens
FOR SELECT
USING (true);

-- Create UPDATE policy (allow anyone to update)
CREATE POLICY "Allow UPDATE on license_tokens"
ON license_tokens
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Insert 5 initial test tokens
INSERT INTO license_tokens (token, status) VALUES 
('A1b2C3d4E5f!', 'inactive'),
('X9y8Z7w6V5u@', 'inactive'),
('M3n2O1p0Q9r#', 'inactive'),
('S7t6U5v4W3x$', 'inactive'),
('K1l2M3n4O5p%', 'inactive')
ON CONFLICT (token) DO NOTHING;

-- Verify tokens were inserted
SELECT token, status, device_id, activated_at FROM license_tokens ORDER BY token;

