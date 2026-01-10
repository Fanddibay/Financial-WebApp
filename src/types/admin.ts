/**
 * Admin Panel Types
 */

export interface LicenseToken {
  token: string
  device_id: string | null
  status: 'active' | 'inactive' | 'disabled' // Note: 'disabled' may not be in DB CHECK constraint
  activated_at: string | null
}

export interface AuditLog {
  id?: string
  action: 'activate' | 'deactivate' | 'refund' | 'create' | 'update' | 'system'
  license_token: string | null
  performed_by: string | null // admin email or "system"
  source: 'admin_panel' | 'webhook' | 'system'
  details?: string | null
  created_at?: string
}

export interface AdminLicenseFilters {
  status: 'active' | 'inactive' | 'disabled' | 'all'
  search: string
}

export interface AdminAuditFilters {
  action: AuditLog['action'] | 'all'
  search: string
}

