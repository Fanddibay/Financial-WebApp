<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppHeader from '@/components/layout/AppHeader.vue'
import BottomNav from '@/components/navigation/BottomNav.vue'
import ChatButton from '@/components/chat/ChatButton.vue'
import ChatWindow from '@/components/chat/ChatWindow.vue'
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-900 dark:text-slate-100">
    <AppHeader />
    <main class="overflow-y-auto">
      <RouterView />
    </main>

    <!-- Bottom Navigation -->
    <BottomNav />

    <!-- Chat Components -->
    <ChatButton />
    <ChatWindow />
  </div>
</template>
