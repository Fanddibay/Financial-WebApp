import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ToastType =
  | 'success'
  | 'error'
  | 'warning'
  | 'info'
  | 'transaction-income'
  | 'transaction-expense'

export interface ToastAction {
  label: string
  path: string
}

export interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
  action?: ToastAction
}

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<Toast[]>([])

  function showToast(
    message: string,
    type: ToastType = 'info',
    duration: number = 3000,
    action?: ToastAction,
  ) {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const toast: Toast = {
      id,
      message,
      type,
      duration,
      action,
    }

    toasts.value.push(toast)

    // Auto remove after duration
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }

    return id
  }

  function removeToast(id: string) {
    const index = toasts.value.findIndex((t) => t.id === id)
    if (index !== -1) {
      toasts.value.splice(index, 1)
    }
  }

  function clearAll() {
    toasts.value = []
  }

  // Convenience methods
  function success(message: string, duration?: number) {
    return showToast(message, 'success', duration)
  }

  function error(message: string, duration?: number) {
    return showToast(message, 'error', duration)
  }

  function warning(message: string, duration?: number) {
    return showToast(message, 'warning', duration)
  }

  function info(message: string, duration?: number) {
    return showToast(message, 'info', duration)
  }

  /** Toast for transaction added: green (income) or red (expense). Optional action e.g. "Lihat transaksi" → pocket. */
  function transactionAdded(
    message: string,
    variant: 'income' | 'expense',
    duration = 4000,
    action?: ToastAction,
  ) {
    const type: ToastType =
      variant === 'income' ? 'transaction-income' : 'transaction-expense'
    return showToast(message, type, duration, action)
  }

  return {
    toasts,
    showToast,
    removeToast,
    clearAll,
    success,
    error,
    warning,
    info,
    transactionAdded,
  }
})

