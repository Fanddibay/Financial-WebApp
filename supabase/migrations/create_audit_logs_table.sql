-- Create audit_logs table for tracking admin and system actions
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action VARCHAR(50) NOT NULL CHECK (action IN ('activate', 'deactivate', 'refund', 'create', 'update', 'system')),
  license_token TEXT,
  performed_by TEXT, -- admin email or "system"
  source VARCHAR(50) NOT NULL DEFAULT 'system' CHECK (source IN ('admin_panel', 'webhook', 'system')),
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_license_token ON audit_logs(license_token);
CREATE INDEX IF NOT EXISTS idx_audit_logs_performed_by ON audit_logs(performed_by);

-- Enable Row Level Security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Allow admins to read audit logs
-- Note: This assumes admins are authenticated via Supabase Auth
-- You may need to adjust this based on your RLS setup
CREATE POLICY "Allow SELECT on audit_logs for authenticated admins"
ON audit_logs
FOR SELECT
TO authenticated
USING (true); -- In production, add admin role check here

-- Policy: Allow insert for admin panel and webhooks
-- Note: Webhooks use service role, so they bypass RLS
CREATE POLICY "Allow INSERT on audit_logs for authenticated admins"
ON audit_logs
FOR INSERT
TO authenticated
WITH CHECK (true); -- In production, add admin role check here

