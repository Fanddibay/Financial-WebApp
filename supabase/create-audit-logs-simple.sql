-- ============================================
-- SIMPLE SQL TO CREATE AUDIT_LOGS TABLE
-- Copy and paste this entire file into Supabase SQL Editor
-- Then click "Run"
-- ============================================

-- Step 1: Create the audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action VARCHAR(50) NOT NULL CHECK (action IN ('activate', 'deactivate', 'refund', 'create', 'update', 'system')),
  license_token TEXT,
  performed_by TEXT,
  source VARCHAR(50) NOT NULL DEFAULT 'system' CHECK (source IN ('admin_panel', 'webhook', 'system')),
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_license_token ON audit_logs(license_token);
CREATE INDEX IF NOT EXISTS idx_audit_logs_performed_by ON audit_logs(performed_by);

-- Step 3: Enable Row Level Security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow SELECT on audit_logs for authenticated admins" ON audit_logs;
DROP POLICY IF EXISTS "Allow INSERT on audit_logs for authenticated admins" ON audit_logs;
DROP POLICY IF EXISTS "Allow SELECT on audit_logs for authenticated" ON audit_logs;
DROP POLICY IF EXISTS "Allow INSERT on audit_logs for authenticated" ON audit_logs;

-- Step 5: Create RLS policies for authenticated users
-- Policy: Allow SELECT (read audit logs)
CREATE POLICY "Allow SELECT on audit_logs for authenticated"
ON audit_logs
FOR SELECT
TO authenticated
USING (true);

-- Policy: Allow INSERT (create audit log entries)
CREATE POLICY "Allow INSERT on audit_logs for authenticated"
ON audit_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Step 6: Verify the table was created (optional - this will show in results)
SELECT 
  'audit_logs table created successfully!' as status,
  COUNT(*) as row_count
FROM audit_logs;

-- Done! Refresh your admin panel to see audit logs.

