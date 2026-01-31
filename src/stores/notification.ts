import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { NotificationPeriod } from '@/composables/useNotification'

const STORAGE_KEY_READ_IDS = 'fanplanner_notification_read_ids'
const STORAGE_KEY_DELETED_IDS = 'fanplanner_notification_deleted_ids'

function loadStringSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as unknown
    return new Set(Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : [])
  } catch {
    return new Set()
  }
}

function saveStringSet(key: string, set: Set<string>) {
  try {
    localStorage.setItem(key, JSON.stringify([...set]))
  } catch {
    // ignore
  }
}

export const useNotificationStore = defineStore('notification', () => {
  const showHistorySheet = ref(false)
  const historyPeriod = ref<NotificationPeriod | null>(null)

  const readIds = ref<Set<string>>(loadStringSet(STORAGE_KEY_READ_IDS))
  const deletedIds = ref<Set<string>>(loadStringSet(STORAGE_KEY_DELETED_IDS))

  function openHistorySheet(period: NotificationPeriod | null) {
    historyPeriod.value = period
    showHistorySheet.value = true
  }

  function closeHistorySheet() {
    showHistorySheet.value = false
    historyPeriod.value = null
  }

  function markAsRead(id: string) {
    readIds.value = new Set(readIds.value).add(id)
    saveStringSet(STORAGE_KEY_READ_IDS, readIds.value)
  }

  function deleteNotification(id: string) {
    deletedIds.value = new Set(deletedIds.value).add(id)
    saveStringSet(STORAGE_KEY_DELETED_IDS, deletedIds.value)
  }

  const isRead = computed(() => (id: string) => readIds.value.has(id))
  const isDeleted = computed(() => (id: string) => deletedIds.value.has(id))

  return {
    showHistorySheet,
    historyPeriod,
    readIds,
    deletedIds,
    openHistorySheet,
    closeHistorySheet,
    markAsRead,
    deleteNotification,
    isRead,
    isDeleted,
  }
})
