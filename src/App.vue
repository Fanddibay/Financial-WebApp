<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { RouterView } from 'vue-router'
import AppHeader from '@/components/layout/AppHeader.vue'
import BottomNav from '@/components/navigation/BottomNav.vue'
import AdminBottomNav from '@/components/admin/AdminBottomNav.vue'
import ChatButton from '@/components/chat/ChatButton.vue'
import ChatWindow from '@/components/chat/ChatWindow.vue'
import Toast from '@/components/ui/Toast.vue'

const route = useRoute()

// Hide header and nav for admin routes (but show admin nav on main admin pages)
const isAdminRoute = computed(() => route.path.startsWith('/admin'))
// Hide app header on routes that use their own page header (Dashboard, History, Profile, TransactionForm, Pocket Detail)
const usePageHeaderRoutes = ['dashboard', 'transactions', 'profile', 'transaction-new', 'transaction-edit', 'pocket-detail', 'pockets']
const hideAppHeader = computed(() => {
  if (isAdminRoute.value) return true
  const name = route.name as string
  if (name && usePageHeaderRoutes.includes(name)) return true
  if (/^\/pockets\/[^/]+$/.test(route.path)) return true
  return false
})
const showAppHeader = computed(() => !hideAppHeader.value)
const showAdminNav = computed(() => {
  const path = route.path
  return path.startsWith('/admin') && path !== '/admin/login' && path !== '/admin/access-denied'
})
</script>

<template>
  <div class="flex h-dvh flex-col overflow-hidden bg-slate-50 text-slate-900 transition-colors dark:bg-slate-900 dark:text-slate-100">
    <AppHeader v-if="showAppHeader" class="shrink-0" />
    <main class="min-h-0 flex-1 overflow-y-auto" :class="{ 'overflow-y-auto': !isAdminRoute }">
      <RouterView />
    </main>

    <!-- Bottom Navigation - show regular nav or admin nav -->
    <BottomNav v-if="!isAdminRoute" />
    <AdminBottomNav v-if="showAdminNav" />

    <!-- Chat Components - hidden on admin routes -->
    <ChatButton v-if="!isAdminRoute" />
    <ChatWindow v-if="!isAdminRoute" />

    <!-- Toast Notifications -->
    <Toast />
  </div>
</template>
