import { createRouter, createWebHistory, type RouteLocationNormalized } from 'vue-router'
import { supabase } from '@/services/supabase'
import { isAdminUser } from '@/utils/adminAuth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/HomeView.vue'),
    },
    {
      path: '/transactions',
      name: 'transactions',
      component: () => import('../views/TransactionsView.vue'),
    },
    {
      path: '/transactions/new',
      name: 'transaction-new',
      component: () => import('../views/TransactionFormView.vue'),
    },
    {
      path: '/transactions/:id/edit',
      name: 'transaction-edit',
      component: () => import('../views/TransactionFormView.vue'),
      props: true,
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('../views/DashboardView.vue'),
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('../views/ProfileView.vue'),
    },
    // Admin routes
    {
      path: '/admin/login',
      name: 'admin-login',
      component: () => import('../views/admin/AdminLoginView.vue'),
      meta: { requiresGuest: true },
    },
    {
      path: '/admin/access-denied',
      name: 'admin-access-denied',
      component: () => import('../views/admin/AccessDeniedView.vue'),
    },
    {
      path: '/admin',
      name: 'admin',
      redirect: '/admin/dashboard',
      meta: { requiresAdmin: true },
    },
    {
      path: '/admin/dashboard',
      name: 'admin-dashboard',
      component: () => import('../views/admin/AdminDashboardView.vue'),
      meta: { requiresAdmin: true },
    },
    {
      path: '/admin/add-license',
      name: 'admin-add-license',
      component: () => import('../views/admin/AddLicenseView.vue'),
      meta: { requiresAdmin: true },
    },
    {
      path: '/admin/audit-logs',
      name: 'admin-audit-logs',
      component: () => import('../views/admin/AdminAuditLogsView.vue'),
      meta: { requiresAdmin: true },
    },
    {
      path: '/admin/profile',
      name: 'admin-profile',
      component: () => import('../views/admin/AdminProfileView.vue'),
      meta: { requiresAdmin: true },
    },
    // Catch-all for /admin/* routes - must be before general catch-all
    {
      path: '/admin/:pathMatch(.*)*',
      name: 'admin-catch-all',
      redirect: '/admin',
      meta: { requiresAdmin: true },
    },
    // Catch-all for all other unmatched routes - must be last
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('../views/NotFoundView.vue'),
    },
  ],
})

// Navigation guard for admin routes
router.beforeEach(async (to: RouteLocationNormalized, from, next) => {
  const requiresAdmin = to.matched.some((record) => record.meta.requiresAdmin)
  const requiresGuest = to.matched.some((record) => record.meta.requiresGuest)

  // Skip auth check if route doesn't require admin or guest status
  if (!requiresAdmin && !requiresGuest) {
    next()
    return
  }

  try {
    // Get current session from Supabase
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError) {
      console.error('Session error:', sessionError)
    }

    const user = session?.user ?? null
    const isAdmin = isAdminUser(user)

    // Handle admin routes
    if (requiresAdmin) {
      // If not logged in, redirect to admin login
      if (!user) {
        next({ name: 'admin-login', query: { redirect: to.fullPath } })
        return
      }

      // If logged in but not admin, redirect to access denied
      if (!isAdmin) {
        next({ name: 'admin-access-denied' })
        return
      }

      // User is admin, allow access
      next()
      return
    }

    // Handle guest routes (like admin login)
    if (requiresGuest) {
      // If already logged in as admin, redirect to admin dashboard
      if (user && isAdmin) {
        next({ name: 'admin-dashboard' })
        return
      }

      // Not logged in or not admin, allow access to login page
      next()
      return
    }

    // Should not reach here, but just in case
    next()
  } catch (error) {
    console.error('Router guard error:', error)
    // On error, redirect to login if trying to access admin, otherwise allow
    if (requiresAdmin) {
      next({ name: 'admin-login' })
    } else {
      next()
    }
  }
})

export default router
