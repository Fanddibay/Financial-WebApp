import type { User } from '@supabase/supabase-js'

/**
 * Admin email whitelist
 * Add admin emails here, or configure via environment variable VITE_ADMIN_EMAILS
 * Format: comma-separated list, e.g., "admin@example.com,admin2@example.com"
 */
function getAdminEmails(): string[] {
  const envEmails = import.meta.env.VITE_ADMIN_EMAILS
  if (envEmails) {
    return envEmails.split(',').map((email: string) => email.trim().toLowerCase())
  }
  return []
}

/**
 * Check if a user is an admin
 * User is admin if:
 * 1. Their email is in the admin whitelist, OR
 * 2. Their user_metadata.role === "admin"
 *
 * @param user - The Supabase user object
 * @returns true if user is admin, false otherwise
 */
export function isAdminUser(user: User | null): boolean {
  if (!user || !user.email) {
    return false
  }

  const adminEmails = getAdminEmails()

  // Check email whitelist
  if (adminEmails.length > 0 && adminEmails.includes(user.email.toLowerCase())) {
    return true
  }

  // Check user_metadata.role
  if (user.user_metadata?.role === 'admin') {
    return true
  }

  return false
}

