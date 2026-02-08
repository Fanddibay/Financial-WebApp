<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useToastStore } from '@/stores/toast'
import type { ToastType } from '@/stores/toast'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

const router = useRouter()
const toastStore = useToastStore()

const toasts = computed(() => toastStore.toasts)

function handleAction(toast: { id: string; action?: { label: string; path: string } }) {
  if (!toast.action) return
  toastStore.removeToast(toast.id)
  router.push(toast.action.path)
}

const boxStyles: Record<ToastType, string> = {
  success:
    'bg-green-50 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800',
  'transaction-income':
    'bg-green-50 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800',
  error:
    'bg-red-50 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800',
  delete:
    'bg-red-50 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800',
  'transaction-expense':
    'bg-red-50 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800',
  warning:
    'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800',
  info: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800',
}

const iconStyles: Record<ToastType, string> = {
  success: 'text-green-600 dark:text-green-400',
  'transaction-income': 'text-green-600 dark:text-green-400',
  error: 'text-red-600 dark:text-red-400',
  delete: 'text-red-600 dark:text-red-400',
  'transaction-expense': 'text-red-600 dark:text-red-400',
  warning: 'text-amber-600 dark:text-amber-400',
  info: 'text-blue-600 dark:text-blue-400',
}

const btnStyles: Record<ToastType, string> = {
  success: 'text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30',
  'transaction-income': 'text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30',
  error: 'text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30',
  delete: 'text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30',
  'transaction-expense': 'text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30',
  warning: 'text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30',
  info: 'text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30',
}

function toastIcon(type: ToastType): 'check-circle' | 'exclamation-triangle' | 'exclamation-circle' | 'info-circle' | 'trash' {
  if (type === 'delete') return 'trash'
  if (type === 'success' || type === 'transaction-income' || type === 'transaction-expense') return 'check-circle'
  if (type === 'error') return 'exclamation-triangle'
  if (type === 'warning') return 'exclamation-circle'
  return 'info-circle'
}
</script>

<template>
  <Teleport to="body">
    <div
      class="toast-container fixed left-1/2 z-[9999] -translate-x-1/2 w-[calc(100vw-2rem)] max-w-[min(400px,90vw)] pointer-events-none flex flex-col items-stretch gap-2"
style="bottom: calc(5.5rem + env(safe-area-inset-bottom, 0px));">
      <TransitionGroup name="toast" tag="div" class="flex flex-col items-stretch gap-2">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          :class="[
            'toast-item pointer-events-auto rounded-xl border shadow-lg overflow-hidden',
            'flex flex-col gap-3',
            'min-w-0 w-full',
            'px-4 py-3',
            boxStyles[toast.type] ?? boxStyles.info,
          ]">
          <div class="flex items-start gap-3 min-w-0">
            <span
              :class="['flex h-6 w-6 shrink-0 items-center justify-center text-base', iconStyles[toast.type] ?? iconStyles.info]">
              <font-awesome-icon :icon="['fas', toastIcon(toast.type)]" class="h-4 w-4" />
            </span>
            <p class="text-sm font-medium leading-snug flex-1 min-w-0 pt-0.5 break-words">
              {{ toast.message }}
            </p>
            <button
              type="button"
              aria-label="Close"
              @click="toastStore.removeToast(toast.id)"
              :class="['flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition', btnStyles[toast.type] ?? btnStyles.info]">
              <font-awesome-icon :icon="['fas', 'times']" class="h-4 w-4" />
            </button>
          </div>
          <div v-if="toast.action" class="flex shrink-0 w-full -mb-0.5">
            <button
              type="button"
              @click.stop="handleAction(toast)"
              :class="[
                'w-full rounded-lg py-2 px-3 text-sm font-semibold transition',
                (toast.type === 'transaction-income' || toast.type === 'success')
                  ? 'bg-green-600 text-white hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-500'
                  : (toast.type === 'transaction-expense' || toast.type === 'error' || toast.type === 'delete')
                    ? 'bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500'
                    : 'bg-slate-600 text-white hover:bg-slate-700 dark:bg-slate-600 dark:hover:bg-slate-500',
              ]">
              {{ toast.action.label }}
            </button>
          </div>
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
