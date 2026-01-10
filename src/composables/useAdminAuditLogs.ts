import { ref, computed } from 'vue'
import { supabase } from '@/services/supabase'
import type { AuditLog, AdminAuditFilters } from '@/types/admin'

/**
 * Composable for admin audit logs
 * Handles fetching and filtering audit log entries
 */
export function useAdminAuditLogs() {
  const logs = ref<AuditLog[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const filters = ref<AdminAuditFilters>({
    action: 'all',
    search: '',
  })

  // Filtered logs
  const filteredLogs = computed(() => {
    let result = [...logs.value]

    // Filter by action
    if (filters.value.action !== 'all') {
      result = result.filter((log) => log.action === filters.value.action)
    }

    // Filter by search
    if (filters.value.search.trim()) {
      const searchLower = filters.value.search.trim().toLowerCase()
      result = result.filter((log) => {
        const token = log.license_token || ''
        const performedBy = log.performed_by || ''
        const details = log.details || ''
        return (
          token.toLowerCase().includes(searchLower) ||
          performedBy.toLowerCase().includes(searchLower) ||
          details.toLowerCase().includes(searchLower)
        )
      })
    }

    // Sort by created_at (newest first)
    return result.sort((a, b) => {
      const dateA = a.created_at || ''
      const dateB = b.created_at || ''
      return dateB.localeCompare(dateA)
    })
  })

  /**
   * Fetch audit logs
   */
  async function fetchAuditLogs(limit = 100) {
    try {
      loading.value = true
      error.value = null

      // Try to fetch audit logs
      const { data, error: fetchError } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (fetchError) {
        console.error('Supabase audit logs error:', fetchError)
        console.error('Error code:', fetchError.code)
        console.error('Error message:', fetchError.message)
        console.error('Error details:', fetchError.details)
        console.error('Error hint:', fetchError.hint)
        
        // Check if table doesn't exist
        const errorMsg = fetchError.message || ''
        const errorCode = fetchError.code || ''
        
        if (
          errorMsg.includes('relation "audit_logs" does not exist') ||
          errorMsg.includes('relation "public.audit_logs" does not exist') ||
          errorMsg.includes('does not exist') ||
          errorCode === '42P01' || // PostgreSQL error code for "undefined table"
          errorCode === 'PGRST116' // PostgREST error for missing table
        ) {
          console.warn('audit_logs table does not exist yet. Create it using the migration SQL.')
          logs.value = []
          error.value = 'The audit_logs table does not exist. Please run the SQL migration in Supabase SQL Editor. See the error message below for instructions.'
          loading.value = false
          return
        }

        // Check if it's a permissions/RLS issue
        if (
          errorMsg.includes('permission denied') ||
          errorMsg.includes('insufficient privilege') ||
          errorMsg.includes('new row violates row-level security') ||
          errorMsg.includes('RLS') ||
          errorMsg.includes('policy') ||
          errorCode === '42501' || // PostgreSQL error code for "insufficient privilege"
          errorCode === 'PGRST301' // PostgREST error for RLS violation
        ) {
          console.warn('Permission denied accessing audit_logs. Check RLS policies.')
          logs.value = []
          error.value = 'Permission denied. RLS policies are blocking access. Please run create-audit-logs-simple.sql in Supabase SQL Editor to set up the policies (see instructions below).'
          loading.value = false
          return
        }

        // Other Supabase errors - show raw error for debugging
        logs.value = []
        const rawErrorMsg = errorMsg || 'Unknown error occurred'
        // Avoid duplication if error message already contains our prefix
        if (rawErrorMsg.includes('Database error') || rawErrorMsg.includes('Failed to fetch')) {
          error.value = rawErrorMsg
        } else {
          error.value = `Database error: ${rawErrorMsg}${errorCode ? ` (Code: ${errorCode})` : ''}. Please check your Supabase configuration and ensure the audit_logs table exists with proper RLS policies.`
        }
        loading.value = false
        return
      }

      // Success - map data correctly
      if (data) {
        logs.value = data.map((item: any) => ({
          id: item.id || null,
          action: item.action || 'system',
          license_token: item.license_token || null,
          performed_by: item.performed_by || null,
          source: item.source || 'system',
          details: item.details || null,
          created_at: item.created_at || null,
        }))
      } else {
        logs.value = []
      }
      
      // Clear error if successful
      error.value = null
    } catch (err) {
      console.error('Unexpected error fetching audit logs:', err)
      logs.value = []
      
      if (err instanceof Error) {
        const errMsg = err.message.toLowerCase()
        // Avoid duplication - check if error message already contains our text
        if (err.message.includes('audit_logs') || err.message.includes('does not exist') || err.message.includes('RLS') || err.message.includes('permission')) {
          // Error already has helpful message, use it as-is
          error.value = err.message
        } else if (errMsg.includes('relation') && errMsg.includes('does not exist')) {
          error.value = 'The audit_logs table does not exist. Please run the SQL migration (see instructions in the error box below).'
        } else if (errMsg.includes('permission') || errMsg.includes('rls') || errMsg.includes('policy')) {
          error.value = 'Permission denied. RLS policies are blocking access. Please run create-audit-logs-simple.sql to fix this (see instructions below).'
        } else {
          // For unexpected errors, check if message already has context
          const msg = err.message
          if (msg.includes('audit') || msg.includes('table') || msg.includes('RLS')) {
            error.value = msg
          } else {
            error.value = `Unexpected error: ${msg}. Check browser console for details and ensure audit_logs table exists.`
          }
        }
      } else {
        error.value = 'An unexpected error occurred while fetching audit logs. Please check your browser console for details and ensure the audit_logs table exists.'
      }
    } finally {
      loading.value = false
    }
  }

  /**
   * Format timestamp for display
   */
  function formatTimestamp(timestamp: string | null | undefined): string {
    if (!timestamp) return 'N/A'

    try {
      const date = new Date(timestamp)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMs / 3600000)
      const diffDays = Math.floor(diffMs / 86400000)

      if (diffMins < 1) return 'Just now'
      if (diffMins < 60) return `${diffMins}m ago`
      if (diffHours < 24) return `${diffHours}h ago`
      if (diffDays < 7) return `${diffDays}d ago`

      // Format as date
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return timestamp
    }
  }

  /**
   * Format full timestamp for detailed view
   */
  function formatFullTimestamp(timestamp: string | null | undefined): string {
    if (!timestamp) return 'N/A'

    try {
      const date = new Date(timestamp)
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    } catch {
      return timestamp
    }
  }

  /**
   * Shorten token for display
   */
  function shortenToken(token: string | null): string {
    if (!token) return 'N/A'
    if (token.length <= 12) return token
    return `${token.substring(0, 6)}...${token.substring(token.length - 6)}`
  }

  return {
    logs,
    loading,
    error,
    filters,
    filteredLogs,
    fetchAuditLogs,
    formatTimestamp,
    formatFullTimestamp,
    shortenToken,
  }
}

