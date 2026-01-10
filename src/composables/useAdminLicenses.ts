import { ref, computed, watch } from 'vue'
import { supabase } from '@/services/supabase'
import { useAdminAuth } from './useAdminAuth'
import type { LicenseToken, AdminLicenseFilters } from '@/types/admin'

/**
 * Composable for admin license management
 * Handles fetching, activating, and deactivating license tokens
 */
export function useAdminLicenses() {
  const licenses = ref<LicenseToken[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const { user } = useAdminAuth()

  const filters = ref<AdminLicenseFilters>({
    status: 'all',
    search: '',
  })

  // Pagination state
  const currentPage = ref(1)
  const rowsPerPage = ref<5 | 10 | 15>(10)

  // Filtered licenses (before pagination)
  const filteredLicenses = computed(() => {
    let result = [...licenses.value]

    // Filter by status
    if (filters.value.status !== 'all') {
      result = result.filter((license) => license.status === filters.value.status)
    }

    // Filter by search
    if (filters.value.search.trim()) {
      const searchLower = filters.value.search.trim().toLowerCase()
      result = result.filter((license) => license.token.toLowerCase().includes(searchLower))
    }

    // Sort by activated_at (newest first)
    return result.sort((a, b) => {
      const dateA = a.activated_at || ''
      const dateB = b.activated_at || ''
      return dateB.localeCompare(dateA)
    })
  })

  // Paginated licenses (after pagination)
  const paginatedLicenses = computed(() => {
    const start = (currentPage.value - 1) * rowsPerPage.value
    const end = start + rowsPerPage.value
    return filteredLicenses.value.slice(start, end)
  })

  // Pagination info
  const paginationInfo = computed(() => {
    const total = filteredLicenses.value.length
    const totalPages = Math.ceil(total / rowsPerPage.value)
    const start = total === 0 ? 0 : (currentPage.value - 1) * rowsPerPage.value + 1
    const end = Math.min(currentPage.value * rowsPerPage.value, total)

    return {
      total,
      totalPages,
      currentPage: currentPage.value,
      start,
      end,
      hasNextPage: currentPage.value < totalPages,
      hasPrevPage: currentPage.value > 1,
    }
  })

  // Stats
  const stats = computed(() => {
    const total = licenses.value.length
    const active = licenses.value.filter((l) => l.status === 'active').length
    const inactive = licenses.value.filter((l) => l.status === 'inactive').length
    const disabled = licenses.value.filter((l) => l.status === 'disabled').length

    return { total, active, inactive, disabled }
  })

  /**
   * Fetch all license tokens
   */
  async function fetchLicenses() {
    try {
      loading.value = true
      error.value = null

      const { data, error: fetchError } = await supabase
        .from('license_tokens')
        .select('*')
        .order('activated_at', { ascending: false, nullsFirst: false })

      if (fetchError) {
        throw fetchError
      }

      licenses.value = (data || []).map((item) => ({
        token: item.token,
        device_id: item.device_id || null,
        status: (item.status || 'inactive') as 'active' | 'inactive' | 'disabled',
        activated_at: item.activated_at || null,
        // created_at doesn't exist in the table schema, so we don't map it
      }))
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch licenses'
      console.error('Error fetching licenses:', err)
      licenses.value = []
    } finally {
      loading.value = false
    }
  }

  /**
   * Activate a license token
   */
  async function activateLicense(token: string) {
    try {
      loading.value = true
      error.value = null

      const { error: updateError } = await supabase
        .from('license_tokens')
        .update({
          status: 'active',
          activated_at: new Date().toISOString(),
        })
        .eq('token', token)

      if (updateError) {
        throw updateError
      }

      // Log audit entry
      await logAuditAction({
        action: 'activate',
        license_token: token,
        performed_by: user.value?.email || null,
        source: 'admin_panel',
      })

      // Refresh licenses
      await fetchLicenses()

      return { success: true }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to activate license'
      console.error('Error activating license:', err)
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  /**
   * Deactivate a license token
   */
  async function deactivateLicense(token: string) {
    try {
      loading.value = true
      error.value = null

      const { error: updateError } = await supabase
        .from('license_tokens')
        .update({
          status: 'inactive',
          device_id: null,
          activated_at: null,
        })
        .eq('token', token)

      if (updateError) {
        throw updateError
      }

      // Log audit entry
      await logAuditAction({
        action: 'deactivate',
        license_token: token,
        performed_by: user.value?.email || null,
        source: 'admin_panel',
      })

      // Refresh licenses
      await fetchLicenses()

      return { success: true }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to deactivate license'
      console.error('Error deactivating license:', err)
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  /**
   * Disable a license token (permanent deactivation)
   */
  async function disableLicense(token: string) {
    try {
      loading.value = true
      error.value = null

      const { error: updateError } = await supabase
        .from('license_tokens')
        .update({
          status: 'disabled',
          device_id: null,
          activated_at: null,
        })
        .eq('token', token)

      if (updateError) {
        throw updateError
      }

      // Log audit entry
      await logAuditAction({
        action: 'deactivate',
        license_token: token,
        performed_by: user.value?.email || null,
        source: 'admin_panel',
        details: 'License disabled permanently',
      })

      // Refresh licenses
      await fetchLicenses()

      return { success: true }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to disable license'
      console.error('Error disabling license:', err)
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  /**
   * Log audit action
   */
  async function logAuditAction(log: {
    action: 'activate' | 'deactivate' | 'refund' | 'create' | 'update' | 'system'
    license_token: string | null
    performed_by: string | null
    source: 'admin_panel' | 'webhook' | 'system'
    details?: string | null
  }) {
    try {
      const { error: insertError } = await supabase.from('audit_logs').insert({
        action: log.action,
        license_token: log.license_token,
        performed_by: log.performed_by,
        source: log.source,
        details: log.details || null,
        created_at: new Date().toISOString(),
      })

      if (insertError) {
        console.error('Failed to log audit action:', insertError)
        // Don't throw - audit logging should not block operations
      }
    } catch (err) {
      console.error('Error logging audit action:', err)
      // Don't throw - audit logging should not block operations
    }
  }

  /**
   * Create a new license token (UUID-based)
   */
  async function createLicense() {
    try {
      loading.value = true
      error.value = null

      // Generate UUID v4 token
      const token = crypto.randomUUID()

      // Insert data - based on actual table schema (token, device_id, status, activated_at)
      // Note: created_at is NOT in the table schema
      const insertData = {
        token,
        status: 'inactive' as const,
      }

      const { data, error: insertError } = await supabase
        .from('license_tokens')
        .insert(insertData)
        .select()
        .single()

      if (insertError) {
        console.error('Insert error details:', insertError)
        
        // Check for RLS/permission errors
        if (insertError.message && (
          insertError.message.includes('permission') || 
          insertError.message.includes('RLS') || 
          insertError.message.includes('policy') ||
          insertError.code === '42501' // PostgreSQL permission denied
        )) {
          throw new Error('Permission denied. Please check that RLS policies allow INSERT operations for authenticated users. Run the fix-admin-rls.sql migration.')
        }

        // Check for duplicate token error
        if (insertError.message && (
          insertError.message.includes('duplicate') || 
          insertError.message.includes('unique') ||
          insertError.code === '23505' // PostgreSQL unique violation
        )) {
          throw new Error('License token already exists. Please try generating again.')
        }

        // Check for column/schema errors
        if (insertError.message && insertError.message.includes('column')) {
          throw new Error(`Database schema error: ${insertError.message}. Please check table structure matches expected schema.`)
        }

        throw insertError
      }

      // Log audit entry
      await logAuditAction({
        action: 'create',
        license_token: token,
        performed_by: user.value?.email || null,
        source: 'admin_panel',
        details: 'License token created',
      })

      // Refresh licenses
      await fetchLicenses()

      return { success: true, token, data }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create license'
      error.value = errorMessage
      console.error('Error creating license:', err)
      
      // Provide more specific error messages
      if (errorMessage.includes('permission') || errorMessage.includes('RLS') || errorMessage.includes('policy')) {
        error.value = 'Permission denied. Please check RLS policies allow INSERT on license_tokens table for authenticated admins.'
      } else if (errorMessage.includes('duplicate') || errorMessage.includes('unique')) {
        error.value = 'License token already exists. Please try generating again.'
      } else {
        error.value = `Failed to create license: ${errorMessage}`
      }
      
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  /**
   * Copy token to clipboard
   */
  async function copyTokenToClipboard(token: string) {
    try {
      await navigator.clipboard.writeText(token)
      return { success: true }
    } catch (err) {
      console.error('Failed to copy token:', err)
      return { success: false, error: 'Failed to copy token' }
    }
  }

  // Pagination functions
  function goToPage(page: number) {
    const maxPage = paginationInfo.value.totalPages
    if (page >= 1 && page <= maxPage) {
      currentPage.value = page
      // Scroll to top of table on mobile
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  function nextPage() {
    if (paginationInfo.value.hasNextPage) {
      goToPage(currentPage.value + 1)
    }
  }

  function prevPage() {
    if (paginationInfo.value.hasPrevPage) {
      goToPage(currentPage.value - 1)
    }
  }

  function setRowsPerPage(rows: 5 | 10 | 15) {
    rowsPerPage.value = rows
    // Reset to page 1 when changing rows per page
    currentPage.value = 1
  }

  // Reset to page 1 when filters change
  watch([() => filters.value.status, () => filters.value.search], () => {
    currentPage.value = 1
  })

  return {
    licenses,
    loading,
    error,
    filters,
    filteredLicenses,
    paginatedLicenses,
    paginationInfo,
    rowsPerPage,
    currentPage,
    stats,
    fetchLicenses,
    createLicense,
    activateLicense,
    deactivateLicense,
    disableLicense,
    copyTokenToClipboard,
    goToPage,
    nextPage,
    prevPage,
    setRowsPerPage,
  }
}

