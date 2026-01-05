<script setup lang="ts">
import { useChatStore } from '@/stores/chat'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

const chatStore = useChatStore()

// No need to define isDark for theme; button styling uses Tailwind's dark: classes for dark mode
</script>

<template>
  <button
    class="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-lg dark:shadow-xl transition hover:scale-110 hover:shadow-xl dark:hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-brand/60 dark:focus:ring-brand/40"
    @click="chatStore.toggleChat" :aria-label="chatStore.isOpen ? 'Tutup chat' : 'Buka chat'">
    <font-awesome-icon :icon="chatStore.isOpen ? ['fas', 'times'] : ['fas', 'comments']"
      class="text-xl transition-transform" :class="{ 'rotate-90': chatStore.isOpen }" />
  </button>
</template>
