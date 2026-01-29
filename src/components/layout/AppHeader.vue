<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useProfileStore } from '@/stores/profile'

const route = useRoute()
const profileStore = useProfileStore()

const showDate = computed(() => {
  const routesWithDate = ['dashboard']
  return routesWithDate.includes(route.name as string)
})

const showGreeting = computed(() => route.name !== 'home')

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Selamat Pagi'
  if (hour < 18) return 'Selamat Siang'
  return 'Selamat Malam'
})

const currentDate = computed(() => {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
})

const displayName = computed(() => {
  return profileStore.profile.name || 'Pengguna'
})

const avatarUrl = computed(() => profileStore.profile.avatar ?? '')
</script>

<template>
  <header
    class="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-700 dark:bg-slate-900/80">
    <div class="mx-auto flex max-w-[430px] flex-col px-4 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <router-link to="/" class="flex items-center gap-2">
            <div>
              <img src="/src/assets/logo.svg" alt="Logo" class="w-24" />
            </div>
          </router-link>
        </div>
        <div class="flex items-center gap-2">
          <div v-if="showGreeting" class="text-right">
            <h5 class="text-xs font-medium text-slate-900 dark:text-slate-100">
              {{ greeting }}, <br> {{ displayName }}
            </h5>
            <p v-if="showDate" class="text-xs text-slate-500 dark:text-slate-400">{{ currentDate }}</p>
          </div>
          <router-link to="/profile">
            <button
              class="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-brand/40 hover:text-brand dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              aria-label="Profile">
              <img
                v-if="avatarUrl"
                :src="avatarUrl"
                alt=""
                class="h-full w-full object-cover"
              />
              <font-awesome-icon v-else :icon="['fas', 'user-circle']" class="text-xl" />
            </button>
          </router-link>
        </div>
      </div>
    </div>
  </header>
</template>
