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
const showAdminNav = computed(() => {
  const path = route.path
  // Show admin nav only on main admin pages, not on login/access-denied
  return path.startsWith('/admin') && path !== '/admin/login' && path !== '/admin/access-denied'
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-900 dark:text-slate-100">
    <AppHeader v-if="!isAdminRoute" />
    <main :class="{ 'overflow-y-auto': !isAdminRoute }">
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
