<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useProfileStore } from '@/stores/profile'
import { useTokenStore } from '@/stores/token'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useI18n } from 'vue-i18n'
import { useGreeting } from '@/composables/useGreeting'

const route = useRoute()
const profileStore = useProfileStore()
const tokenStore = useTokenStore()
const { t } = useI18n()
const { greeting } = useGreeting()

const showSubscribedPopup = ref(false)
const showNotSubscribedPopup = ref(false)

const showDate = computed(() => {
  const routesWithDate = ['dashboard']
  return routesWithDate.includes(route.name as string)
})

// Only show greeting when route is resolved and we're not on home (avoids flash on refresh)
const showGreeting = computed(() => {
  const name = route.name
  return name != null && name !== 'home'
})

const currentDate = computed(() => {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
})

const displayName = computed(() => {
  return profileStore.profile.name || t('home.guest')
})

const avatarUrl = computed(() => profileStore.profile.avatar ?? '')

function handleCrownClick() {
  if (tokenStore.isLicenseActive) showSubscribedPopup.value = true
  else showNotSubscribedPopup.value = true
}

function handleGetSubscription() {
  showNotSubscribedPopup.value = false
  window.open('https://fanbayy.lemonsqueezy.com/checkout/buy/db17c48d-ec06-4575-b419-bd32433e0cbe', '_blank')
}
</script>

<template>
  <header
    class="sticky top-0 z-40 border-b border-slate-200 bg-white/95 px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-4 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
    <div class="mx-auto flex max-w-[430px] flex-col">
      <div class="flex items-center justify-between">
        <div class="flex min-w-0 flex-1 items-center gap-3">
          <router-link to="/" class="flex items-center gap-2">
            <div>
              <img src="/src/assets/logo.svg" alt="Logo" class="w-24" />
            </div>
          </router-link>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <button type="button" :class="[
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition active:scale-95',
            tokenStore.isLicenseActive
              ? 'bg-amber-100 text-amber-600 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50'
              : 'bg-slate-100 text-slate-400 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-500 dark:hover:bg-slate-600',
          ]" aria-label="Subscription" @click="handleCrownClick">
            <font-awesome-icon :icon="['fas', 'crown']" class="h-5 w-5" />
          </button>
          <div v-if="showGreeting" class="text-right">
            <h5 class="text-xs font-medium text-slate-900 dark:text-slate-100">
              {{ greeting }}, <br> {{ displayName }}
            </h5>
            <p v-if="showDate" class="text-xs text-slate-500 dark:text-slate-400">{{ currentDate }}</p>
          </div>
          <router-link to="/profile">
            <button
              class="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-brand/40 hover:text-brand dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              aria-label="Profile">
              <img v-if="avatarUrl" :src="avatarUrl" alt="" class="h-full w-full object-cover" />
              <font-awesome-icon v-else :icon="['fas', 'user-circle']" class="text-xl" />
            </button>
          </router-link>
        </div>
      </div>
    </div>
  </header>

  <!-- Subscribed (crown) popup -->
  <BottomSheet :is-open="showSubscribedPopup" :title="t('profile.subscribedPopupTitle')" max-height="60"
    @close="showSubscribedPopup = false">
    <p class="text-slate-600 dark:text-slate-300">{{ t('profile.subscribedPopupMessage') }}</p>
    <template #footer>
      <BaseButton class="w-full" @click="showSubscribedPopup = false">
        {{ t('common.close') }}
      </BaseButton>
    </template>
  </BottomSheet>

  <!-- Not subscribed (crown) popup -->
  <BottomSheet :is-open="showNotSubscribedPopup" :title="t('profile.notSubscribedPopupTitle')" max-height="60"
    @close="showNotSubscribedPopup = false">
    <p class="text-slate-600 dark:text-slate-300">{{ t('profile.notSubscribedPopupMessage') }}</p>
    <template #footer>
      <div class="flex flex-col gap-2">
        <BaseButton class="w-full text-white" variant="teritary" @click="handleGetSubscription">
          <font-awesome-icon :icon="['fas', 'shopping-cart']" class="mr-2" />
          {{ t('profile.getTokenCta') }}
        </BaseButton>
        <BaseButton variant="secondary" class="w-full" @click="showNotSubscribedPopup = false">
          {{ t('common.close') }}
        </BaseButton>
      </div>
    </template>
  </BottomSheet>
</template>
