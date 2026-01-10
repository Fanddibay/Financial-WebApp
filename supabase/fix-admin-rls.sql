-- ============================================
-- FIX ADMIN PANEL RLS POLICIES
-- Run this SQL in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. Fix license_tokens RLS policies
-- ============================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow INSERT on license_tokens for authenticated" ON license_tokens;
DROP POLICY IF EXISTS "Allow SELECT on license_tokens for authenticated" ON license_tokens;
DROP POLICY IF EXISTS "Allow UPDATE on license_tokens for authenticated" ON license_tokens;

-- Allow authenticated users to INSERT license tokens (for admin panel)
-- Note: This policy allows any authenticated user to insert
-- In production, you may want to restrict this to admin role only
CREATE POLICY "Allow INSERT on license_tokens for authenticated"
ON license_tokens
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to SELECT license tokens (for admin panel)
CREATE POLICY "Allow SELECT on license_tokens for authenticated"
ON license_tokens
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to UPDATE license tokens (for admin panel)
CREATE POLICY "Allow UPDATE on license_tokens for authenticated"
ON license_tokens
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- ============================================
-- 2. Create audit_logs table if it doesn't exist
-- ============================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action VARCHAR(50) NOT NULL CHECK (action IN ('activate', 'deactivate', 'refund', 'create', 'update', 'system')),
  license_token TEXT,
  performed_by TEXT, -- admin email or "system"
  source VARCHAR(50) NOT NULL DEFAULT 'system' CHECK (source IN ('admin_panel', 'webhook', 'system')),
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_license_token ON audit_logs(license_token);
CREATE INDEX IF NOT EXISTS idx_audit_logs_performed_by ON audit_logs(performed_by);

-- Enable Row Level Security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. Fix audit_logs RLS policies
-- ============================================

-- Drop existing policies if they exist (both naming variations)
DROP POLICY IF EXISTS "Allow SELECT on audit_logs for authenticated admins" ON audit_logs;
DROP POLICY IF EXISTS "Allow INSERT on audit_logs for authenticated admins" ON audit_logs;
DROP POLICY IF EXISTS "Allow SELECT on audit_logs for authenticated" ON audit_logs;
DROP POLICY IF EXISTS "Allow INSERT on audit_logs for authenticated" ON audit_logs;

-- Allow authenticated users to SELECT audit logs (for admin panel)
CREATE POLICY "Allow SELECT on audit_logs for authenticated"
ON audit_logs
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to INSERT audit logs (for admin panel)
CREATE POLICY "Allow INSERT on audit_logs for authenticated"
ON audit_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- ============================================
-- Verification queries (optional - run to check)
-- ============================================

-- Check license_tokens policies
-- SELECT * FROM pg_policies WHERE tablename = 'license_tokens';

-- Check audit_logs policies
-- SELECT * FROM pg_policies WHERE tablename = 'audit_logs';

-- Test SELECT access
-- SELECT COUNT(*) FROM license_tokens;
-- SELECT COUNT(*) FROM audit_logs;

