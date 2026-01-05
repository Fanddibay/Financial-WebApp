import { defineStore } from 'pinia'
import { ref } from 'vue'

const STORAGE_KEY = 'financial_tracker_profile'

interface Profile {
  name: string
  phone: string
  avatar?: string
  notificationsEnabled: boolean
}

export const useProfileStore = defineStore('profile', () => {
  // Initialize profile from localStorage or use defaults
  const getInitialProfile = (): Profile => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        return JSON.parse(stored)
      }
    } catch {
      // Ignore parse errors
    }
    return {
      name: 'User',
      phone: '',
      avatar: '',
      notificationsEnabled: true,
    }
  }

  const profile = ref<Profile>(getInitialProfile())

  // Update profile
  function updateProfile(updates: Partial<Profile>) {
    profile.value = { ...profile.value, ...updates }
    saveProfile()
  }

  // Save to localStorage
  function saveProfile() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile.value))
    } catch {
      // Ignore storage errors
    }
  }

  return {
    profile,
    updateProfile,
  }
})

