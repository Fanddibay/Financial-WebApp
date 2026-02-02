import { defineStore } from 'pinia'
import { ref } from 'vue'

const STORAGE_KEY = 'financial_tracker_profile'
const AVATAR_STORAGE_KEY = 'financial_tracker_avatar'

export type NotificationFrequency = 'daily' | 'weekly' | 'monthly' | 'custom'

interface Profile {
  name: string
  phone: string
  avatar?: string
  notificationsEnabled: boolean
  notificationFrequency: NotificationFrequency
  notificationCustomDays: number
  /** Jam notifikasi format 24h, e.g. "09:00" */
  notificationTime: string
  showBalance: boolean
}

// Avatar is stored only in AVATAR_STORAGE_KEY so export/import never includes it.
function getStoredAvatar(): string {
  try {
    const v = localStorage.getItem(AVATAR_STORAGE_KEY)
    return typeof v === 'string' ? v : ''
  } catch {
    return ''
  }
}

function setStoredAvatar(value: string) {
  try {
    if (value) {
      localStorage.setItem(AVATAR_STORAGE_KEY, value)
    } else {
      localStorage.removeItem(AVATAR_STORAGE_KEY)
    }
  } catch {
    // Ignore storage errors
  }
}

export const useProfileStore = defineStore('profile', () => {
  const getInitialProfile = (): Profile => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, unknown>
        const { avatar: _a, ...rest } = parsed
        return {
          name: (rest.name as string) ?? 'User',
          phone: (rest.phone as string) ?? '',
          notificationsEnabled: (rest.notificationsEnabled as boolean) ?? true,
          notificationFrequency: (rest.notificationFrequency as NotificationFrequency) ?? 'daily',
          notificationCustomDays: typeof rest.notificationCustomDays === 'number' ? Math.max(1, Math.min(365, rest.notificationCustomDays)) : 3,
          notificationTime: typeof rest.notificationTime === 'string' && /^\d{2}:\d{2}$/.test(rest.notificationTime as string) ? (rest.notificationTime as string) : '09:00',
          avatar: getStoredAvatar(),
          showBalance: (rest.showBalance as boolean) ?? false,
        }
      }
    } catch {
      // Ignore parse errors
    }
    return {
      name: 'User',
      phone: '',
      notificationsEnabled: true,
      notificationFrequency: 'daily' as NotificationFrequency,
      notificationCustomDays: 3,
      notificationTime: '09:00',
      avatar: getStoredAvatar(),
      showBalance: false,
    }
  }

  const profile = ref<Profile>(getInitialProfile())

  function updateProfile(updates: Partial<Profile>) {
    profile.value = { ...profile.value, ...updates }
    if (updates.avatar !== undefined) {
      setStoredAvatar(updates.avatar)
    }
    saveProfile()
  }

  // Persist only name/phone/notifications; never avatar (so export stays clean).
  function saveProfile() {
    try {
      const { avatar: _a, ...toSave } = profile.value
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
    } catch {
      // Ignore storage errors
    }
  }

  return {
    profile,
    updateProfile,
  }
})

