import { ref, onMounted, onUnmounted } from 'vue'
import { syncLocalStorageToCache } from '@/utils/pwaDataSync'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * Composable for PWA install functionality
 * Handles the beforeinstallprompt event and provides install state
 */
export function usePWAInstall() {
  const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null)
  const isInstallable = ref(false)
  const isInstalled = ref(false)
  const isInstalling = ref(false)

  // Check if app is already installed
  function checkIfInstalled() {
    // Check if running in standalone mode (installed PWA)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      isInstalled.value = true
      isInstallable.value = false
      return true
    }

    // Check for iOS standalone mode
    if ((window.navigator as any).standalone === true) {
      isInstalled.value = true
      isInstallable.value = false
      return true
    }

    return false
  }

  function handleBeforeInstallPrompt(e: Event) {
    // Prevent the default browser install prompt
    e.preventDefault()
    // Sync data to cache now so when user installs/add-to-home, PWA gets latest data
    syncLocalStorageToCache()
    // Store the event for later use
    deferredPrompt.value = e as BeforeInstallPromptEvent
    isInstallable.value = true
  }

  async function install() {
    if (!deferredPrompt.value) {
      return false
    }

    try {
      isInstalling.value = true
      // Sync data to cache immediately before install so the installed PWA has current data
      await syncLocalStorageToCache()

      // Show the install prompt
      await deferredPrompt.value.prompt()

      // Wait for the user to respond
      const choiceResult = await deferredPrompt.value.userChoice

      if (choiceResult.outcome === 'accepted') {
        // User accepted the install prompt
        isInstalled.value = true
        isInstallable.value = false
        deferredPrompt.value = null
        return true
      } else {
        // User dismissed the install prompt
        return false
      }
    } catch (error) {
      console.error('Error during PWA installation:', error)
      return false
    } finally {
      isInstalling.value = false
    }
  }

  function handleAppInstalled() {
    // App was installed
    isInstalled.value = true
    isInstallable.value = false
    deferredPrompt.value = null
  }

  let checkInterval: ReturnType<typeof setInterval> | null = null

  onMounted(() => {
    // Check if already installed
    checkIfInstalled()

    // Listen for the beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    
    // Listen for app installed event
    window.addEventListener('appinstalled', handleAppInstalled)

    // Debug: Log installability status
    console.log('PWA Install Status:', {
      isInstallable: isInstallable.value,
      isInstalled: isInstalled.value,
      userAgent: navigator.userAgent,
    })

    // Check if browser supports PWA installation
    if ('serviceWorker' in navigator) {
      console.log('Service Worker supported')
    }

    // Re-check periodically (in case user installs via browser menu)
    checkInterval = setInterval(() => {
      if (!isInstalled.value) {
        checkIfInstalled()
      }
    }, 1000)
  })

  onUnmounted(() => {
    window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.removeEventListener('appinstalled', handleAppInstalled)
    if (checkInterval) {
      clearInterval(checkInterval)
    }
  })

  return {
    isInstallable,
    isInstalled,
    isInstalling,
    install,
  }
}

