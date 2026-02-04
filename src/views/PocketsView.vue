<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { usePocketStore } from '@/stores/pocket'
import { useTokenStore } from '@/stores/token'
import { useProfileStore } from '@/stores/profile'
import { usePocketLimits } from '@/composables/usePocketLimits'
import { useTransactions } from '@/composables/useTransactions'
import PageHeader from '@/components/layout/PageHeader.vue'
import PocketCard from '@/components/pockets/PocketCard.vue'
import CreatePocketModal from '@/components/pockets/CreatePocketModal.vue'
import PocketLimitUpgradeSheet from '@/components/pockets/PocketLimitUpgradeSheet.vue'
import PocketDisabledSheet from '@/components/pockets/PocketDisabledSheet.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { formatIDR } from '@/utils/currency'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const pocketStore = usePocketStore()
const tokenStore = useTokenStore()
const profileStore = useProfileStore()
const { pocketBalances, fetchTransactions } = useTransactions()
const { getSortedPockets, isAtPocketLimit, isPocketDisabled } = usePocketLimits()

// Local visibility state removed in favor of global profileStore.profile.showBalance
const showCreateModal = ref(false)
const showPocketLimitUpgrade = ref(false)
const showPocketDisabledSheet = ref(false)

const totalBalanceAllPockets = computed(() => {
  const bal = pocketBalances.value
  return Object.values(bal).reduce((s, n) => s + n, 0)
})

const displayTotalBalance = computed(() =>
  profileStore.profile.showBalance ? formatIDR(totalBalanceAllPockets.value) : '••••••••',
)

const pocketsWithBalances = computed(() => {
  const sorted = getSortedPockets(pocketStore.pockets)
  const isPremium = tokenStore.isLicenseActive
  return sorted.map((p) => ({
    ...p,
    balance: pocketBalances.value[p.id] ?? 0,
    disabled: isPocketDisabled(p.id, pocketStore.pockets, isPremium),
  }))
})

function handleCreateClick() {
  if (isAtPocketLimit(tokenStore.isLicenseActive, pocketStore.pockets.length)) {
    showPocketLimitUpgrade.value = true
    return
  }
  showCreateModal.value = true
}

function handleCreatePocket(data: { name: string; icon: string; type: 'spending' | 'saving'; color?: string }) {
  pocketStore.createPocket(data)
  showCreateModal.value = false
}

onMounted(() => {
  pocketStore.fetchPockets()
  fetchTransactions()
})
</script>

<template>
  <div class="mx-auto max-w-[430px] space-y-6 px-4 pb-32 pt-24">
    <PageHeader :title="t('pocket.title')" :subtitle="t('pocket.pageSubtitle')">
      <template #right>
        <BaseButton variant="primary" size="sm" @click="handleCreateClick">
          <font-awesome-icon :icon="['fas', 'plus']" class="mr-2" />
          {{ t('pocket.createPocket') }}
        </BaseButton>
      </template>
    </PageHeader>

    <!-- My Assets card (sama seperti tampilan Home sebelumnya) -->
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
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-brand/40 hover:bg-brand/5 hover:text-brand dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-brand/40"
        :aria-label="profileStore.profile.showBalance ? t('home.hideBalance') : t('home.showBalance')"
        @click="profileStore.updateProfile({ showBalance: !profileStore.profile.showBalance })">
        <font-awesome-icon :icon="['fas', profileStore.profile.showBalance ? 'eye-slash' : 'eye']" class="h-5 w-5" />
      </button>
    </div>

    <!-- Pocket grid (2 kolom) + Create Pocket (sama seperti Home sebelumnya) -->
    <div v-if="pocketsWithBalances.length > 0" class="grid grid-cols-2 gap-3">
      <PocketCard v-for="p in pocketsWithBalances" :key="p.id" :pocket="p" :balance="p.balance"
        :hide-balance="!profileStore.profile.showBalance" :disabled="p.disabled"
        @disabled-click="showPocketDisabledSheet = true" />
      <button type="button"
        class="flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 text-slate-500 transition hover:border-brand/40 hover:bg-brand/5 hover:text-brand dark:border-slate-700 dark:bg-slate-800/30 dark:hover:border-brand/40"
        @click="handleCreateClick">
        <font-awesome-icon :icon="['fas', 'plus']" class="h-6 w-6" />
        <span class="text-sm font-medium">{{ t('pocket.createPocket') }}</span>
      </button>
    </div>

    <!-- Empty state: belum ada kantong -->
    <div v-else
      class="flex flex-col items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-12 px-6 text-center dark:border-slate-700 dark:bg-slate-800/30">
      <span
        class="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-brand/10 text-4xl text-brand dark:bg-brand/20"
        aria-hidden="true">
        <font-awesome-icon :icon="['fas', 'wallet']" class="h-10 w-10" />
      </span>
      <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">
        {{ t('pocket.noPocketsYet') }}
      </h2>
      <p class="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
        {{ t('pocket.noPocketsYetDesc') }}
      </p>
      <BaseButton variant="primary" size="lg" class="mt-6" @click="handleCreateClick">
        <font-awesome-icon :icon="['fas', 'plus']" class="mr-2" />
        {{ t('pocket.createPocket') }}
      </BaseButton>
    </div>

    <CreatePocketModal :is-open="showCreateModal" @close="showCreateModal = false" @created="handleCreatePocket" />
    <PocketLimitUpgradeSheet :is-open="showPocketLimitUpgrade" @close="showPocketLimitUpgrade = false" />
    <PocketDisabledSheet :is-open="showPocketDisabledSheet" @close="showPocketDisabledSheet = false" />
  </div>
</template>
