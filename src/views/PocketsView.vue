<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePocketStore } from '@/stores/pocket'
import { useGoalStore, GOAL_LIMIT_REACHED } from '@/stores/goal'
import { useToastStore } from '@/stores/toast'
import { useTokenStore } from '@/stores/token'
import { useProfileStore } from '@/stores/profile'
import { usePocketLimits } from '@/composables/usePocketLimits'
import { useTransactions } from '@/composables/useTransactions'
import PageHeader from '@/components/layout/PageHeader.vue'
import PocketCard from '@/components/pockets/PocketCard.vue'
import GoalCard from '@/components/goals/GoalCard.vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import CreatePocketModal from '@/components/pockets/CreatePocketModal.vue'
import CreateGoalModal from '@/components/goals/CreateGoalModal.vue'
import PocketLimitUpgradeSheet from '@/components/pockets/PocketLimitUpgradeSheet.vue'
import PocketDisabledSheet from '@/components/pockets/PocketDisabledSheet.vue'
import GoalLimitUpgradeSheet from '@/components/goals/GoalLimitUpgradeSheet.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { formatIDR } from '@/utils/currency'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const pocketStore = usePocketStore()
const goalStore = useGoalStore()
const toastStore = useToastStore()
const tokenStore = useTokenStore()
const profileStore = useProfileStore()
const { pocketBalances, fetchTransactions } = useTransactions()
const { getSortedPockets, isAtPocketLimit, isAtGoalLimit, isPocketDisabled } = usePocketLimits()

// Local visibility state removed in favor of global profileStore.profile.showBalance
const activeTab = ref<'pocket' | 'goal'>('pocket')
const showCreateChoiceModal = ref(false)
const showCreateModal = ref(false)
const showCreateGoalModal = ref(false)
const showPocketLimitUpgrade = ref(false)
const showGoalLimitUpgrade = ref(false)
const showPocketDisabledSheet = ref(false)

const totalBalanceAllPockets = computed(() => {
  const bal = pocketBalances.value
  const pocketsTotal = Object.values(bal).reduce((s, n) => s + n, 0)
  const goalsTotal = Object.values(goalStore.goalDisplayBalances).reduce((s, n) => s + n, 0)
  return pocketsTotal + goalsTotal
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

const goalsWithBalances = computed(() => goalStore.goalsWithBalances)

function openCreateChoice() {
  showCreateChoiceModal.value = true
}

function chooseCreatePocket() {
  showCreateChoiceModal.value = false
  if (isAtPocketLimit(tokenStore.isLicenseActive, pocketStore.pockets.length)) {
    showPocketLimitUpgrade.value = true
    return
  }
  showCreateModal.value = true
}

function chooseCreateGoal() {
  showCreateChoiceModal.value = false
  if (isAtGoalLimit(tokenStore.isLicenseActive, goalStore.goals.length)) {
    showGoalLimitUpgrade.value = true
    return
  }
  showCreateGoalModal.value = true
}

function handleCreateClick() {
  if (activeTab.value === 'pocket') {
    chooseCreatePocket()
  } else {
    chooseCreateGoal()
  }
}

function handleCreatePocket(data: { name: string; icon: string; type: 'spending' | 'saving'; color?: string }) {
  pocketStore.createPocket(data)
  showCreateModal.value = false
  toastStore.success(t('pocket.createSuccess', { name: data.name }))
}

function handleCreateGoal(data: { name: string; icon: string; targetAmount: number; durationMonths: number; color?: string }) {
  try {
    goalStore.createGoal(data)
    showCreateGoalModal.value = false
    toastStore.success(t('goal.createSuccess', { name: data.name }))
  } catch (e) {
    const err = e as Error & { code?: string }
    if (err.code === GOAL_LIMIT_REACHED) {
      showCreateGoalModal.value = false
      showGoalLimitUpgrade.value = true
    } else {
      throw e
    }
  }
}

// Sync URL with tab so Back from goal detail returns to the same tab
watch(() => route.query.tab, (tab) => {
  activeTab.value = tab === 'goal' ? 'goal' : 'pocket'
}, { immediate: true })

function setTab(tab: 'pocket' | 'goal') {
  activeTab.value = tab
  router.replace({
    path: '/pockets',
    query: tab === 'goal' ? { tab: 'goal' } : {},
  })
}

onMounted(() => {
  pocketStore.fetchPockets()
  goalStore.fetchGoals()
  fetchTransactions()
})
</script>

<template>
  <div class="mx-auto max-w-[430px] space-y-6 px-4 pb-32 pt-24">
    <PageHeader :title="t('pocket.title')" :subtitle="t('pocket.pageSubtitle')">
      <template #right>
        <BaseButton variant="primary" size="sm" @click="openCreateChoice">
          <font-awesome-icon :icon="['fas', 'plus']" class="mr-2" />
          {{ t('common.create') }}
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

    <!-- Tabs: Pocket and Goals -->
    <div class="flex gap-2 border-b border-slate-200 dark:border-slate-700">
      <button type="button" :class="[
        'flex-1 py-3 text-sm font-medium transition-colors',
        activeTab === 'pocket'
          ? 'border-b-2 border-brand text-brand'
          : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300',
      ]" @click="setTab('pocket')">
        💼 {{ t('goal.tabPocket') }}
      </button>
      <button type="button" :class="[
        'flex-1 py-3 text-sm font-medium transition-colors',
        activeTab === 'goal'
          ? 'border-b-2 border-brand text-brand'
          : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300',
      ]" @click="setTab('goal')">
        🎯 {{ t('goal.tabGoal') }}
      </button>
    </div>

    <!-- Pocket Tab Content -->
    <div v-if="activeTab === 'pocket'">
      <!-- Pocket grid (2 kolom) + Create Pocket -->
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
        <h2 class="text-xl font-semibold text-slate-900 dark:text-slate-100">
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
    </div>

    <!-- Goals Tab Content -->
    <div v-if="activeTab === 'goal'">
      <!-- Goals grid (2 kolom) + Add Goal -->
      <div v-if="goalsWithBalances.length > 0" class="grid grid-cols-2 gap-3">
        <GoalCard v-for="g in goalsWithBalances" :key="g.id" :goal="g" :current-balance="g.currentBalance"
          :hide-balance="!profileStore.profile.showBalance" />
        <button type="button"
          class="flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 text-slate-500 transition hover:border-brand/40 hover:bg-brand/5 hover:text-brand dark:border-slate-700 dark:bg-slate-800/30 dark:hover:border-brand/40"
          @click="handleCreateClick">
          <font-awesome-icon :icon="['fas', 'plus']" class="h-6 w-6" />
          <span class="text-sm font-medium">{{ t('goal.createGoal') }}</span>
        </button>
      </div>

      <!-- Empty state: belum ada goal -->
      <div v-else
        class="flex flex-col items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-12 px-6 text-center dark:border-slate-700 dark:bg-slate-800/30">
        <span
          class="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-brand/10 text-4xl text-brand dark:bg-brand/20"
          aria-hidden="true">
          🎯
        </span>
        <h2 class="text-xl font-semibold text-slate-900 dark:text-slate-100">
          {{ t('goal.noGoalsYet') }}
        </h2>
        <p class="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
          {{ t('goal.noGoalsYetDesc') }}
        </p>
        <BaseButton variant="primary" size="lg" class="mt-6" @click="handleCreateClick">
          <font-awesome-icon :icon="['fas', 'plus']" class="mr-2" />
          {{ t('goal.createGoal') }}
        </BaseButton>
      </div>
    </div>

    <!-- Create choice: Pocket or Goal (bottom sheet) -->
    <BottomSheet :is-open="showCreateChoiceModal" :title="t('pocket.createChoiceTitle')"
      :subtitle="t('pocket.createChoiceSubtitle')" max-height="60" @close="showCreateChoiceModal = false">
      <div class="space-y-2 px-1 py-2">
        <button type="button"
          class="flex w-full items-center gap-4 rounded-xl border-2 border-slate-200 bg-white px-4 py-4 text-left transition hover:border-brand/40 hover:bg-brand/5 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-brand/40"
          @click="chooseCreatePocket">
          <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700">
            <font-awesome-icon :icon="['fas', 'wallet']" class="h-6 w-6 text-slate-600 dark:text-slate-400" />
          </div>
          <div class="min-w-0 flex-1 text-left">
            <p class="font-semibold text-slate-900 dark:text-slate-100">{{ t('pocket.createPocket') }}</p>
            <p class="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{{ t('pocket.createDesc') }}</p>
          </div>
        </button>
        <button type="button"
          class="flex w-full items-center gap-4 rounded-xl border-2 border-slate-200 bg-white px-4 py-4 text-left transition hover:border-brand/40 hover:bg-brand/5 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-brand/40"
          @click="chooseCreateGoal">
          <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-xl">
            🎯
          </div>
          <div class="min-w-0 flex-1 text-left">
            <p class="font-semibold text-slate-900 dark:text-slate-100">{{ t('goal.createGoal') }}</p>
            <p class="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{{ t('goal.createDesc') }}</p>
          </div>
        </button>
      </div>
    </BottomSheet>

    <CreatePocketModal :is-open="showCreateModal" @close="showCreateModal = false" @created="handleCreatePocket" />
    <CreateGoalModal :is-open="showCreateGoalModal" @close="showCreateGoalModal = false" @created="handleCreateGoal" />
    <PocketLimitUpgradeSheet :is-open="showPocketLimitUpgrade" @close="showPocketLimitUpgrade = false" />
    <GoalLimitUpgradeSheet :is-open="showGoalLimitUpgrade" @close="showGoalLimitUpgrade = false" />
    <PocketDisabledSheet :is-open="showPocketDisabledSheet" @close="showPocketDisabledSheet = false" />
  </div>
</template>
