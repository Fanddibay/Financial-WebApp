<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useTransactions } from '@/composables/useTransactions'
import { usePocketLimits } from '@/composables/usePocketLimits'
import { usePocketStore } from '@/stores/pocket'
import { useProfileStore } from '@/stores/profile'
import { useTokenStore } from '@/stores/token'
import PocketCard from '@/components/pockets/PocketCard.vue'
import CreatePocketModal from '@/components/pockets/CreatePocketModal.vue'
import PocketLimitUpgradeSheet from '@/components/pockets/PocketLimitUpgradeSheet.vue'
import PocketDisabledSheet from '@/components/pockets/PocketDisabledSheet.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { formatIDR } from '@/utils/currency'
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()
const { pocketBalances, fetchTransactions } = useTransactions()
const { isAtPocketLimit, getSortedPockets, isPocketDisabled } = usePocketLimits()
const pocketStore = usePocketStore()
const profileStore = useProfileStore()
const tokenStore = useTokenStore()

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return t('home.greetingMorning')
  if (hour < 18) return t('home.greetingAfternoon')
  return t('home.greetingEvening')
})

const dateLocale = computed(() => (locale.value === 'id' ? 'id-ID' : 'en-US'))

const currentDate = computed(() =>
  new Date().toLocaleDateString(dateLocale.value, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }),
)

const displayName = computed(() => profileStore.profile.name || t('home.guest'))

const showTotals = ref(true)
const showCreatePocket = ref(false)
const showPocketLimitUpgrade = ref(false)
const showPocketDisabledSheet = ref(false)

const totalBalanceAllPockets = computed(() => {
  const bal = pocketBalances.value
  return Object.values(bal).reduce((s, n) => s + n, 0)
})

const displayTotalBalance = computed(() =>
  showTotals.value ? formatIDR(totalBalanceAllPockets.value) : '••••••••',
)

const isPremium = computed(() => tokenStore.isLicenseActive)

const pocketsWithBalances = computed(() => {
  const sorted = getSortedPockets(pocketStore.pockets)
  return sorted.map((p) => ({
    ...p,
    balance: pocketBalances.value[p.id] ?? 0,
    disabled: isPocketDisabled(p.id, pocketStore.pockets, isPremium.value),
  }))
})

function handleCreatePocketClick() {
  const atLimit = isAtPocketLimit(tokenStore.isLicenseActive, pocketStore.pockets.length)
  if (atLimit) {
    showPocketLimitUpgrade.value = true
    return
  }
  showCreatePocket.value = true
}

function handleCreatePocket(data: { name: string; icon: string; type: 'spending' | 'saving' | 'investment'; color?: string }) {
  pocketStore.createPocket(data)
  showCreatePocket.value = false
}

onMounted(() => {
  pocketStore.fetchPockets()
  fetchTransactions()
})
</script>

<template>
  <div class="mx-auto max-w-[430px] space-y-6 px-4 pb-24 pt-4">
    <!-- Welcome above My Assets -->
    <div class="px-1">
      <p class="text-lg font-semibold text-slate-900 dark:text-slate-100">
        {{ greeting }}, {{ displayName }}
      </p>
      <p class="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
        {{ currentDate }}
      </p>
    </div>

    <!-- My Assets card -->
    <div class="flex items-start justify-between gap-4 rounded-xl bg-white p-4 shadow-lg dark:bg-slate-800">
      <div class="min-w-0 flex-1">
        <h1 class="text-base font-medium text-slate-500 dark:text-slate-400">
          {{ t('pocket.myAssets') }}
        </h1>
        <p class="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
          {{ displayTotalBalance }}
        </p>
      </div>
      <button type="button"
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-brand/40 hover:bg-brand/5 hover:text-brand dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-brand/40"
        :aria-label="showTotals ? t('home.hideBalance') : t('home.showBalance')" @click="showTotals = !showTotals">
        <font-awesome-icon :icon="['fas', showTotals ? 'eye-slash' : 'eye']" class="h-5 w-5" />
      </button>
    </div>

    <!-- Pocket grid (2 columns) + Create Pocket -->
    <div class="grid grid-cols-2 gap-3">
      <PocketCard
        v-for="p in pocketsWithBalances"
        :key="p.id"
        :pocket="p"
        :balance="p.balance"
        :hide-balance="!showTotals"
        :disabled="p.disabled"
        @disabled-click="showPocketDisabledSheet = true"
      />
      <button type="button"
        class="flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 text-slate-500 transition hover:border-brand/40 hover:bg-brand/5 hover:text-brand dark:border-slate-700 dark:bg-slate-800/30 dark:hover:border-brand/40"
        @click="handleCreatePocketClick">
        <font-awesome-icon :icon="['fas', 'plus']" class="h-6 w-6" />
        <span class="text-sm font-medium">{{ t('pocket.createPocket') }}</span>
      </button>
    </div>

    <CreatePocketModal :is-open="showCreatePocket" @close="showCreatePocket = false" @created="handleCreatePocket" />
    <PocketLimitUpgradeSheet :is-open="showPocketLimitUpgrade" @close="showPocketLimitUpgrade = false" />
    <PocketDisabledSheet :is-open="showPocketDisabledSheet" @close="showPocketDisabledSheet = false" />
  </div>
</template>
