import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

/**
 * Greeting based on time of day (device local time).
 * If user has denied geolocation permission, shows "Selamat datang" / "Welcome" instead.
 *
 * Time bands:
 * - 00:00–04:59 → night (Selamat malam / Good night)
 * - 05:00–11:59 → morning (Selamat pagi / Good morning)
 * - 12:00–17:59 → afternoon (Selamat siang / Good afternoon)
 * - 18:00–23:59 → evening (Selamat sore / Good evening)
 */
export function useGreeting() {
  const { t } = useI18n()
  const locationDenied = ref(false)
  let mounted = true

  onMounted(() => {
    if (typeof navigator === 'undefined' || !navigator.permissions?.query) return
    navigator.permissions
      .query({ name: 'geolocation' })
      .then((status) => {
        if (!mounted) return
        locationDenied.value = status.state === 'denied'
        status.addEventListener('change', () => {
          if (!mounted) return
          locationDenied.value = status.state === 'denied'
        })
      })
      .catch(() => {
        // Unsupported or error: keep time-based greeting
      })
  })

  onBeforeUnmount(() => {
    mounted = false
  })

  const greeting = computed(() => {
    if (locationDenied.value) {
      return t('home.greetingWelcome')
    }
    const hour = new Date().getHours()
    if (hour >= 0 && hour < 5) return t('home.greetingNight')
    if (hour >= 5 && hour < 12) return t('home.greetingMorning')
    if (hour >= 12 && hour < 18) return t('home.greetingAfternoon')
    return t('home.greetingEvening')
  })

  return { greeting }
}
