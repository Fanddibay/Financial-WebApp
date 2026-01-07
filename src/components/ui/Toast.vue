<script setup lang="ts">
import { computed } from 'vue'
import { useToastStore } from '@/stores/toast'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

const toastStore = useToastStore()

const toasts = computed(() => toastStore.toasts)
</script>

<template>
  <Teleport to="body">
    <div class="fixed bottom-20 left-1/2 z-[100] -translate-x-1/2 space-y-2 pointer-events-none max-w-[90%] sm:max-w-md">
      <TransitionGroup
        name="toast"
        tag="div"
        class="space-y-2"
      >
        <div
          v-for="toast in toasts"
          :key="toast.id"
          :class="[
            'pointer-events-auto rounded-lg px-4 py-3 shadow-lg border flex items-center gap-3 min-w-[280px] max-w-full',
            toast.type === 'success'
              ? 'bg-green-50 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800'
              : toast.type === 'error'
              ? 'bg-red-50 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800'
              : toast.type === 'warning'
              ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800'
              : 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800',
          ]"
        >
          <font-awesome-icon
            :icon="[
              'fas',
              toast.type === 'success'
                ? 'check-circle'
                : toast.type === 'error'
                ? 'exclamation-triangle'
                : toast.type === 'warning'
                ? 'exclamation-circle'
                : 'info-circle',
            ]"
            :class="[
              'text-lg flex-shrink-0',
              toast.type === 'success'
                ? 'text-green-600 dark:text-green-400'
                : toast.type === 'error'
                ? 'text-red-600 dark:text-red-400'
                : toast.type === 'warning'
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-blue-600 dark:text-blue-400',
            ]"
          />
          <p class="text-sm font-medium flex-1">{{ toast.message }}</p>
          <button
            type="button"
            @click="toastStore.removeToast(toast.id)"
            :class="[
              'flex-shrink-0 rounded p-1 transition hover:opacity-70',
              toast.type === 'success'
                ? 'text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30'
                : toast.type === 'error'
                ? 'text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30'
                : toast.type === 'warning'
                ? 'text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30'
                : 'text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30',
            ]"
          >
            <font-awesome-icon :icon="['fas', 'times']" class="h-4 w-4" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}

.toast-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}

.toast-move {
  transition: transform 0.3s ease;
}
</style>

