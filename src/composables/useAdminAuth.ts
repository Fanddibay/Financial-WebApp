import { ref, computed } from 'vue'
import { supabase } from '@/services/supabase'
import type { User } from '@supabase/supabase-js'
import { isAdminUser } from '@/utils/adminAuth'

/**
 * Admin Authentication Composable
 * - Handles admin-only login
 * - Validates role from user_metadata
 * - Stable for local & production
 */
export function useAdminAuth() {
  const user = ref<User | null>(null)
  const loading = ref<boolean>(true)
  const error = ref<string | null>(null)

  const isAdmin = computed(() => isAdminUser(user.value))

  /**
   * Load current authenticated user
   * Single source of truth
   */
  async function loadUser() {
    try {
      loading.value = true
      error.value = null

      const { data, error: userError } = await supabase.auth.getUser()

      if (userError) throw userError

      if (!data.user) {
        user.value = null
        return
      }

      if (!isAdminUser(data.user)) {
        await supabase.auth.signOut()
        user.value = null
        throw new Error('Access denied. This account does not have administrator privileges.')
      }

      user.value = data.user
    } catch (err) {
      user.value = null
      error.value =
        err instanceof Error ? err.message : 'Failed to load admin session'
    } finally {
      loading.value = false
    }
  }

  /**
   * Admin sign in
   */
  async function signIn(email: string, password: string) {
    try {
      loading.value = true
      error.value = null

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (signInError) throw signInError

      // IMPORTANT: fetch fresh user (metadata-safe)
      await loadUser()

      if (!user.value) {
        throw new Error('Access denied. This account does not have administrator privileges.')
      }

      return { success: true }
    } catch (err) {
      error.value =
        err instanceof Error
          ? err.message
          : 'Invalid credentials or no admin access'

      await supabase.auth.signOut()
      user.value = null

      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  /**
   * Sign out admin
   */
  async function signOut() {
    await supabase.auth.signOut()
    user.value = null
  }

  /**
   * Listen auth changes (refresh-safe)
   */
  supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') {
      user.value = null
    }
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      loadUser()
    }
  })

  // Init on first use
  loadUser()

  return {
    user,
    isAdmin,
    loading,
    error,
    signIn,
    signOut,
    reload: loadUser,
  }
}
