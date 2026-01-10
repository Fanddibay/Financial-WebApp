<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import {
  faChartLine,
  faPlus,
  faClockRotateLeft,
  faUser,
} from '@fortawesome/free-solid-svg-icons'

const route = useRoute()
const router = useRouter()

const activeTab = computed(() => {
  const currentPath = route.path

  if (currentPath === '/admin' || currentPath === '/admin/dashboard') return 'dashboard'
  if (currentPath === '/admin/add-license') return 'add-license'
  if (currentPath === '/admin/audit-logs') return 'audit-logs'
  if (currentPath === '/admin/profile') return 'profile'

  return 'dashboard'
})

function navigate(path: string) {
  router.push(path)
}
</script>

<template>
  <nav
    class="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
    <div class="mx-auto flex max-w-[430px] items-center justify-around px-2 py-2">
      <!-- Dashboard Button -->
      <button
        :class="[
          'flex flex-col items-center gap-1 rounded-xl px-3 py-2 transition',
          activeTab === 'dashboard'
            ? 'bg-brand/10 text-brand dark:bg-brand/20'
            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100',
        ]"
        @click="navigate('/admin')">
        <FontAwesomeIcon :icon="faChartLine" class="text-lg" />
        <span class="text-xs font-medium">Dashboard</span>
      </button>

      <!-- Add License Button -->
      <button
        :class="[
          'flex flex-col items-center gap-1 rounded-xl px-3 py-2 transition',
          activeTab === 'add-license'
            ? 'bg-brand/10 text-brand dark:bg-brand/20'
            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100',
        ]"
        @click="navigate('/admin/add-license')">
        <FontAwesomeIcon :icon="faPlus" class="text-lg" />
        <span class="text-xs font-medium">Add License</span>
      </button>

      <!-- Audit Logs Button -->
      <button
        :class="[
          'flex flex-col items-center gap-1 rounded-xl px-3 py-2 transition',
          activeTab === 'audit-logs'
            ? 'bg-brand/10 text-brand dark:bg-brand/20'
            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100',
        ]"
        @click="navigate('/admin/audit-logs')">
        <FontAwesomeIcon :icon="faClockRotateLeft" class="text-lg" />
        <span class="text-xs font-medium">Audit Logs</span>
      </button>

      <!-- Profile Button -->
      <button
        :class="[
          'flex flex-col items-center gap-1 rounded-xl px-3 py-2 transition',
          activeTab === 'profile'
            ? 'bg-brand/10 text-brand dark:bg-brand/20'
            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100',
        ]"
        @click="navigate('/admin/profile')">
        <FontAwesomeIcon :icon="faUser" class="text-lg" />
        <span class="text-xs font-medium">Profile</span>
      </button>
    </div>
  </nav>
</template>

