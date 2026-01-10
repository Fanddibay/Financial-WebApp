import { ref, computed } from 'vue'
import { supabase } from '@/services/supabase'
import type { User } from '@supabase/supabase-js'
import { isAdminUser } from '@/utils/adminAuth'

/**
 * Composable for admin authentication
 * Handles admin login, logout, session management, and role checking
 */
export function useAdminAuth() {
  const user = ref<User | null>(null)
  const loading = ref(true)
  const error = ref<string | null>(null)

  // Computed property to check if current user is admin
  const isAdmin = computed(() => isAdminUser(user.value))

  /**
   * Initialize auth state - check for existing session
   */
  async function initializeAuth() {
    try {
      loading.value = true
      error.value = null

      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) {
        throw sessionError
      }

      user.value = session?.user ?? null

      // Verify session is valid
      if (session) {
        const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser()

        if (userError) {
          throw userError
        }

        user.value = currentUser
      }
    } catch (err) {
      console.error('Auth initialization error:', err)
      error.value = err instanceof Error ? err.message : 'Failed to initialize authentication'
      user.value = null
    } finally {
      loading.value = false
    }
  }

  /**
   * Sign in with email and password
   */
  async function signIn(email: string, password: string) {
    try {
      loading.value = true
      error.value = null

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (signInError) {
        throw signInError
      }

      if (!data.user) {
        throw new Error('No user returned from sign in')
      }

      // Check if user is admin
      if (!isAdminUser(data.user)) {
        // Sign out if not admin
        await supabase.auth.signOut()
        throw new Error('Access denied. This account does not have administrator privileges.')
      }

      user.value = data.user
      return { success: true, user: data.user }
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Invalid credentials or you do not have administrator access'

      error.value = errorMessage

      // Handle specific Supabase auth errors
      if (err && typeof err === 'object' && 'message' in err) {
        const supabaseError = err as { message: string }
        if (supabaseError.message.includes('Invalid login credentials')) {
          error.value = 'Invalid email or password'
        } else if (supabaseError.message.includes('Access denied')) {
          error.value = supabaseError.message
        }
      }

      user.value = null
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  /**
   * Sign out current user
   */
  async function signOut() {
    try {
      loading.value = true
      error.value = null

      const { error: signOutError } = await supabase.auth.signOut()

      if (signOutError) {
        throw signOutError
      }

      user.value = null
      return { success: true }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to sign out'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  /**
   * Refresh user session and re-check admin status
   */
  async function refreshSession() {
    try {
      loading.value = true
      error.value = null

      const { data: { user: currentUser }, error: refreshError } = await supabase.auth.getUser()

      if (refreshError) {
        throw refreshError
      }

      user.value = currentUser

      // Re-check admin status
      if (currentUser && !isAdminUser(currentUser)) {
        await signOut()
        throw new Error('Your administrator privileges have been revoked.')
      }

      return { success: true, user: currentUser }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to refresh session'
      user.value = null
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  // Listen to auth state changes
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || !session) {
      user.value = null
    } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      user.value = session.user
    }
  })

  // Initialize on first use
  initializeAuth()

  return {
    user,
    loading,
    error,
    isAdmin,
    signIn,
    signOut,
    refreshSession,
    initializeAuth,
  }
}

