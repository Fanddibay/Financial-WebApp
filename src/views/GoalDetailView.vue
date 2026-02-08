<script setup lang="ts">
import { computed, onMounted, provide, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGoalStore } from '@/stores/goal'
import { useTransactionStore } from '@/stores/transaction'
import { useToastStore } from '@/stores/toast'
import { useProfileStore } from '@/stores/profile'
import AddTransactionModal from '@/components/transactions/AddTransactionModal.vue'
import WithdrawFromGoalModal from '@/components/goals/WithdrawFromGoalModal.vue'
import GoalActionMenu from '@/components/goals/GoalActionMenu.vue'
import EditGoalModal from '@/components/goals/EditGoalModal.vue'
import DeleteGoalModal from '@/components/goals/DeleteGoalModal.vue'
import ExportGoalJsonModal from '@/components/goals/ExportGoalJsonModal.vue'
import TransactionCard from '@/components/transactions/TransactionCard.vue'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import * as investmentGoalService from '@/services/investmentGoalService'
import { formatIDR } from '@/utils/currency'
import { DEFAULT_POCKET_COLOR } from '@/utils/pocketColors'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useI18n } from 'vue-i18n'

function luminance(hex: string): number {
  const h = hex.replace(/^#/, '')
  const n = parseInt(h.length === 3 ? h.replace(/(.)/g, '$1$1') : h.slice(0, 6), 16)
  const r = ((n >> 16) & 255) / 255
  const g = ((n >> 8) & 255) / 255
  const b = (n & 255) / 255
  const f = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const goalStore = useGoalStore()
const txStore = useTransactionStore()
const toastStore = useToastStore()
const profileStore = useProfileStore()

const goalId = computed(() => {
  const id = route.params.id
  return typeof id === 'string' ? id : Array.isArray(id) ? id[0] : ''
})

const goal = computed(() => (goalId.value ? goalStore.getGoalById(goalId.value) : null))

const currentBalance = computed(() => {
  if (!goalId.value) return 0
  return goalStore.goalDisplayBalances[goalId.value] ?? 0
})

const progressPercent = computed(() => {
  if (!goal.value || goal.value.targetAmount === 0) return 0
  return Math.min(100, Math.round((currentBalance.value / goal.value.targetAmount) * 100))
})

const showBalance = ref(true)
const activeTab = ref<'transactions' | 'overview' | 'investment-activity'>('transactions')

const isInvestmentGoal = computed(() => goal.value?.type === 'investment')

const investmentState = computed(() => {
  if (!goalId.value || !isInvestmentGoal.value) return { principal: 0, simulatedReturn: 0 }
  const activities = investmentGoalService.getActivityEntries(goalId.value)
  return investmentGoalService.computeInvestmentState(goalId.value, goalTransactions.value, activities)
})

const investmentActivityList = computed(() => {
  if (!goalId.value) return []
  return investmentGoalService.getActivityEntries(goalId.value)
})
const showAddModal = ref(false)
const showWithdrawModal = ref(false)
const showDeleteConfirm = ref(false)
const transactionToDelete = ref<string | null>(null)
const showActionMenu = ref(false)
const showEditGoalModal = ref(false)
const showDeleteGoalModal = ref(false)
const showExportJsonModal = ref(false)

const transactionMenuOpenId = ref<string | null>(null)
provide('transactionMenuOpenId', transactionMenuOpenId)
provide('transactionMenuSetOpenId', (id: string | null) => {
  transactionMenuOpenId.value = id
})

const canWithdraw = computed(() => currentBalance.value > 0)

const goalTransactions = computed(() => {
  const id = goalId.value
  if (!id) return []
  return txStore.transactions
    .filter((tx) => tx.goalId === id || tx.transferToGoalId === id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
})

const latestSeven = computed(() => goalTransactions.value.slice(0, 7))

const remainingAmount = computed(() => {
  if (!goal.value) return 0
  return Math.max(0, goal.value.targetAmount - currentBalance.value)
})

const inflowTransactions = computed(() =>
  goalTransactions.value.filter(
    (t) => (t.type === 'income' && t.goalId) || (t.type === 'transfer' && t.transferToGoalId)
  )
)

const averagePerTransaction = computed(() => {
  const list = inflowTransactions.value
  const total = list.reduce((sum, t) => sum + t.amount, 0)
  if (list.length === 0) return 0
  return Math.round(total / list.length)
})

const goalInsights = computed(() => {
  const insights: string[] = []
  const count = goalTransactions.value.length
  const inflowCount = inflowTransactions.value.length
  const target = goal.value?.targetAmount ?? 0
  const remaining = remainingAmount.value
  const percent = progressPercent.value

  if (percent >= 100) {
    insights.push(t('goal.insightCompleted'))
    return insights
  }
  if (remaining > 0 && target > 0) {
    insights.push(t('goal.insightRemaining', { amount: formatIDR(remaining), percent: 100 - percent }))
  }
  if (count === 0) {
    insights.push(t('goal.insightNoTransactions'))
  } else {
    if (inflowCount > 0) {
      insights.push(t('goal.insightAvgPerTransaction', { amount: formatIDR(averagePerTransaction.value), count: inflowCount }))
    }
    if (percent < 30 && count > 0) {
      insights.push(t('goal.insightAddMore'))
    }
  }
  return insights
})

const headerBg = computed(() => goal.value?.color ?? DEFAULT_POCKET_COLOR)
const isDarkHeader = computed(() => luminance(headerBg.value) < 0.4)

function goBack() {
  router.back()
}

function handleAddTransaction() {
  showAddModal.value = true
}

function handleWithdraw() {
  showWithdrawModal.value = true
}

function handleSeeAllTransactions() {
  router.push({ path: '/transactions', query: { goalId: goalId.value } })
}

function handleEdit(id: string) {
  router.push({ name: 'transaction-edit', params: { id } })
}

function handleDelete(id: string) {
  transactionToDelete.value = id
  showDeleteConfirm.value = true
}

async function confirmDelete() {
  if (!transactionToDelete.value) return

  const transaction = txStore.transactions.find(t => t.id === transactionToDelete.value)
  const description = transaction?.description || 'Transaction'

  await txStore.deleteTransaction(transactionToDelete.value)
  transactionToDelete.value = null
  showDeleteConfirm.value = false
  toastStore.success(t('transactions.deleteSuccessDesc', { description }))
}

function handleAddModalClose() {
  showAddModal.value = false
}

function handleWithdrawSuccess() {
  txStore.fetchTransactions()
  goalStore.fetchGoals()
}

function handleEditGoalSaved(data: { name: string; icon: string; targetAmount: number; durationMonths: number; color: string }) {
  if (!goalId.value) return
  goalStore.updateGoal(goalId.value, data)
  toastStore.success(t('goal.editSuccess'))
}

function handleDeleteGoalConfirm() {
  if (!goalId.value) return
  goalStore.deleteGoal(goalId.value)
  toastStore.success(t('goal.deleteSuccess'))
  router.push('/pockets')
}

function handleExportJsonSuccess(message: string) {
  toastStore.success(message)
}

function handleExportJsonError(message: string) {
  toastStore.error(message)
}

onMounted(() => {
  goalStore.fetchGoals()
  txStore.fetchTransactions()
  if (goal.value?.type === 'investment') {
    goalStore.runInvestmentSimulations()
  }
})
</script>

<template>
  <div class="mx-auto max-w-[430px] space-y-6 pb-12" :class="goal ? 'pt-0' : 'pt-4'">
    <div v-if="!goal" class="py-12 text-center text-slate-500 dark:text-slate-400">
      <p>{{ t('goal.selectGoal') }}</p>
      <button type="button" class="mt-4 rounded-lg bg-brand px-4 py-2 font-medium text-white hover:bg-brand-dark"
        @click="router.push('/pockets')">
        {{ t('nav.back') }}
      </button>
    </div>

    <template v-else>
      <!-- Flex layout: fixed top (no scroll), only tab content scrolls -->
      <div class="flex h-[calc(100dvh-5.5rem)] min-h-[280px] flex-col overflow-hidden">
        <!-- Fixed top section (never scrolls) -->
        <div class="flex shrink-0 flex-col gap-4">
          <!-- Header: full goal color, no gap top/left/right. -mx-4 edge-to-edge; safe-area for content -->
          <div class="-mx-4 rounded-t-2xl pb-6 pt-[max(1rem,env(safe-area-inset-top))] px-8"
            :style="{ backgroundColor: headerBg }">
            <!-- Top row: Back + Actions -->
            <div class="flex items-center justify-between">
              <button type="button" :class="[
                'flex h-10 w-10 items-center justify-center rounded-full transition',
                isDarkHeader
                  ? 'text-white/90 hover:bg-white/20 hover:text-white'
                  : 'text-slate-600 hover:bg-black/10 hover:text-slate-900',
              ]" :aria-label="t('nav.back')" @click="goBack">
                <font-awesome-icon :icon="['fas', 'chevron-left']" class="h-5 w-5" />
              </button>
              <button type="button" :class="[
                'flex h-10 w-10 items-center justify-center rounded-full transition',
                isDarkHeader
                  ? 'text-white/90 hover:bg-white/20 hover:text-white'
                  : 'text-slate-600 hover:bg-black/10 hover:text-slate-900',
              ]" :aria-label="t('goal.actionMenuTitle')" @click="showActionMenu = true">
                <font-awesome-icon :icon="['fas', 'ellipsis-vertical']" class="h-5 w-5" />
              </button>
            </div>

            <!-- Goal: icon + name + balance -->
            <div class="mt-4 flex items-start gap-4">
              <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl shadow-sm"
                :class="isDarkHeader ? 'bg-white/20' : 'bg-white/90'">
                {{ goal.icon }}
              </div>
              <div class="min-w-0 flex-1">
                <h1 :class="[
                  'mt-0.5 truncate text-xl font-bold',
                  isDarkHeader ? 'text-white' : 'text-slate-900',
                ]">
                  {{ goal.name }}
                </h1>
                <p v-if="isInvestmentGoal && (goal.annualReturnPercentage ?? 0) > 0" :class="[
                  'mt-1 text-sm',
                  isDarkHeader ? 'text-white/80' : 'text-slate-600 dark:text-slate-400',
                ]">
                  {{ t('goal.returnHeader', { percent: goal.annualReturnPercentage }) }}
                </p>
              </div>
            </div>
            <div class="mt-4 flex items-center gap-4">
              <p :class="[
                'min-w-0 flex-1 text-2xl font-bold tracking-tight',
                isDarkHeader ? 'text-white' : 'text-slate-900',
              ]">
                {{ showBalance ? formatIDR(currentBalance) : '••••••••' }}
              </p>
              <button type="button" :class="[
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition',
                isDarkHeader
                  ? 'text-white/90 hover:bg-white/20 hover:text-white'
                  : 'text-slate-600 hover:bg-black/10 hover:text-slate-900',
              ]" :aria-label="showBalance ? t('home.hideBalance') : t('home.showBalance')"
                @click="showBalance = !showBalance">
                <font-awesome-icon :icon="['fas', showBalance ? 'eye-slash' : 'eye']" class="h-5 w-5" />
              </button>
            </div>
          </div>

          <!-- Action buttons: horizontal icon + label -->
          <div class="flex flex-col gap-2 px-4">
            <button type="button"
              class="flex items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-white py-2.5 transition hover:border-brand/40 hover:bg-brand/5 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-brand/40"
              @click="handleAddTransaction">
              <font-awesome-icon :icon="['fas', 'plus']" class="h-5 w-5 shrink-0 text-brand" />
              <span class="text-xs font-medium text-slate-700 dark:text-slate-300">{{ t('pocket.addTransaction')
                }}</span>
            </button>
            <button type="button" :disabled="!canWithdraw"
              class="flex items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-white py-2.5 transition hover:border-brand/40 hover:bg-brand/5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-slate-200 disabled:hover:bg-white dark:border-slate-700 dark:bg-slate-800 dark:hover:border-brand/40 dark:disabled:hover:border-slate-700 dark:disabled:hover:bg-slate-800"
              @click="handleWithdraw">
              <font-awesome-icon :icon="['fas', 'arrow-up-from-bracket']" class="h-5 w-5 shrink-0"
                :class="canWithdraw ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500'" />
              <span class="text-xs font-medium text-slate-700 dark:text-slate-300">{{ t('goal.withdraw') }}</span>
            </button>
          </div>

          <p v-if="!canWithdraw"
            class="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
            {{ t('goal.useFromGoalInsufficient') }}
          </p>

          <!-- Tabs: clean gap and spacing -->
          <div class="shrink-0 mt-4 border-b border-slate-200 dark:border-slate-700">
            <div class="flex gap-1 px-4">
              <button type="button" :class="[
                'flex-1 rounded-t-xl border-b-2 py-3.5 text-sm font-medium transition-colors',
                activeTab === 'transactions'
                  ? 'border-brand bg-white text-brand shadow-sm dark:bg-slate-800 dark:border-brand'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300',
              ]" @click="activeTab = 'transactions'">
                {{ t('pocket.tabTransactions') }}
              </button>
              <button type="button" :class="[
                'flex-1 rounded-t-xl border-b-2 py-3.5 text-sm font-medium transition-colors',
                activeTab === 'overview'
                  ? 'border-brand bg-white text-brand shadow-sm dark:bg-slate-800 dark:border-brand'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300',
              ]" @click="activeTab = 'overview'">
                {{ t('pocket.tabOverview') }}
              </button>
              <button v-if="isInvestmentGoal" type="button" :class="[
                'flex-1 rounded-t-xl border-b-2 py-3.5 text-sm font-medium transition-colors',
                activeTab === 'investment-activity'
                  ? 'border-brand bg-white text-brand shadow-sm dark:bg-slate-800 dark:border-brand'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300',
              ]" @click="activeTab = 'investment-activity'">
                {{ t('goal.investmentActivityTitle') }}
              </button>
            </div>
          </div>
        </div>

        <!-- Scrollable content -->
        <div class="min-h-0 flex-1 overflow-y-auto px-4">
          <!-- Transactions tab -->
          <div v-if="activeTab === 'transactions'" class="space-y-4 py-4">
            <div v-if="latestSeven.length > 0" class="space-y-2">
              <TransactionCard v-for="tx in latestSeven" :key="tx.id" :transaction="tx" @edit="handleEdit(tx.id)"
                @delete="handleDelete(tx.id)" />
              <button v-if="goalTransactions.length > 7" type="button"
                class="w-full rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-3 text-sm font-medium text-slate-600 transition hover:border-brand/40 hover:bg-brand/5 hover:text-brand dark:border-slate-700 dark:bg-slate-800/30 dark:text-slate-400"
                @click="handleSeeAllTransactions">
                {{ t('pocket.seeAllTransactions') }}
              </button>
            </div>
            <div v-else class="py-12 text-center text-slate-500 dark:text-slate-400">
              <p>{{ t('transactions.noTransactions') }}</p>
            </div>
          </div>

          <!-- Overview tab -->
          <div v-if="activeTab === 'overview'" class="space-y-4 pt-4 pb-12">
            <!-- Investment Growth (investment goals only) -->
            <div v-if="isInvestmentGoal" class="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-800">
              <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-100">📊 {{ t('goal.investmentGrowthTitle') }}</h3>
              <div class="mt-2 space-y-2">
                <div class="flex justify-between text-sm">
                  <span class="text-slate-600 dark:text-slate-400">{{ t('goal.currentBalance') }}</span>
                  <span class="font-semibold text-slate-900 dark:text-slate-100">
                    {{ showBalance ? formatIDR(currentBalance) : '••••••••' }}
                  </span>
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-slate-600 dark:text-slate-400">{{ t('goal.initialInvested') }}</span>
                  <span class="font-semibold text-slate-900 dark:text-slate-100">
                    {{ showBalance ? formatIDR(investmentState.principal) : '••••••••' }}
                  </span>
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-slate-600 dark:text-slate-400">{{ t('goal.totalReturn') }}</span>
                  <span class="font-semibold text-green-600 dark:text-green-400">
                    {{ showBalance ? formatIDR(investmentState.simulatedReturn) : '••••••••' }}
                  </span>
                </div>
                <div class="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <div class="h-full bg-brand transition-all" :style="{ width: `${progressPercent}%` }" />
                </div>
                <p class="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  {{ t('goal.simulatedGrowthLabel') }}
                </p>
                <p v-if="investmentState.principal === 0" class="text-xs text-slate-500 dark:text-slate-400">
                  {{ t('goal.startInvestingToSeeGrowth') }}
                </p>
                <p class="text-xs text-amber-600 dark:text-amber-400">
                  {{ t('goal.investmentDisclaimerShort') }}
                </p>
              </div>
            </div>

            <div class="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-800">
              <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-100">{{ t('goal.progress') }}</h3>
              <div class="mt-2 space-y-2">
                <div class="flex justify-between text-sm">
                  <span class="text-slate-600 dark:text-slate-400">{{ t('goal.currentBalance') }}</span>
                  <span class="font-semibold text-slate-900 dark:text-slate-100">
                    {{ showBalance ? formatIDR(currentBalance) : '••••••••' }}
                  </span>
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-slate-600 dark:text-slate-400">{{ t('goal.targetAmountLabel') }}</span>
                  <span class="font-semibold text-slate-900 dark:text-slate-100">
                    {{ showBalance ? formatIDR(goal.targetAmount) : '••••••••' }}
                  </span>
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-slate-600 dark:text-slate-400">{{ t('goal.progress') }}</span>
                  <span class="font-semibold text-slate-900 dark:text-slate-100">{{ progressPercent }}%</span>
                </div>
                <div class="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <div class="h-full bg-brand transition-all" :style="{ width: `${progressPercent}%` }" />
                </div>
              </div>
            </div>
            <div class="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-800">
              <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-100">{{ t('pocket.tabTransactions') }}
              </h3>
              <p class="mt-2 text-sm text-slate-600 dark:text-slate-400">
                {{ goalTransactions.length }} {{ t('pocket.transactionsCount') }}
              </p>
            </div>

            <!-- Insight section: helpful summary below transaction count -->
            <div v-if="goalInsights.length > 0"
              class="rounded-xl border border-brand/20 bg-brand/5 p-4 dark:bg-brand/10">
              <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-100">{{ t('goal.insightTitle') }}</h3>
              <ul class="mt-3 space-y-2">
                <li v-for="(insight, i) in goalInsights" :key="i"
                  class="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <font-awesome-icon :icon="['fas', 'lightbulb']" class="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <span>{{ insight }}</span>
                </li>
              </ul>
            </div>
          </div>

          <!-- Investment Activity tab (investment goals only) -->
          <div v-if="activeTab === 'investment-activity'" class="space-y-4 pt-4 pb-12">
            <p class="text-xs text-slate-500 dark:text-slate-400">
              {{ t('goal.investmentDisclaimerShort') }}
            </p>
            <div v-if="investmentActivityList.length > 0" class="space-y-2">
              <div
                v-for="entry in investmentActivityList"
                :key="entry.id"
                class="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/30"
              >
                <div class="min-w-0 flex-1">
                  <p class="font-medium text-slate-900 dark:text-slate-100">
                    +{{ formatIDR(entry.amount) }} — {{ locale === 'id' ? t('goal.dailyInvestmentReturnId') : t('goal.dailyInvestmentReturn') }}
                  </p>
                  <p class="text-xs text-slate-500 dark:text-slate-400">
                    {{ new Date(entry.date).toLocaleDateString(locale === 'id' ? 'id-ID' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' }) }}
                  </p>
                </div>
                <span class="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                  {{ t('goal.simulationBadge') }}
                </span>
              </div>
            </div>
            <div v-else class="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-12 px-4 text-center dark:border-slate-700 dark:bg-slate-800/30">
              <p class="text-sm text-slate-500 dark:text-slate-400">
                {{ t('goal.startInvestingToSeeGrowth') }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </template>

    <AddTransactionModal :is-open="showAddModal" :locked-goal-id="goalId" @close="handleAddModalClose" />
    <WithdrawFromGoalModal v-if="goal" :is-open="showWithdrawModal" :goal-id="goal.id" :goal-name="goal.name"
      :current-balance="currentBalance" @close="showWithdrawModal = false" @success="handleWithdrawSuccess" />
    <GoalActionMenu :is-open="showActionMenu" :goal="goal" @close="showActionMenu = false"
      @edit="showEditGoalModal = true" @download-json="showExportJsonModal = true"
      @delete="showDeleteGoalModal = true" />

    <EditGoalModal :is-open="showEditGoalModal" :goal="goal" @close="showEditGoalModal = false"
      @saved="handleEditGoalSaved" />

    <DeleteGoalModal :is-open="showDeleteGoalModal" :goal="goal" @close="showDeleteGoalModal = false"
      @confirm="handleDeleteGoalConfirm" />

    <ExportGoalJsonModal :is-open="showExportJsonModal" :goal="goal" :goal-transactions="goalTransactions"
      @close="showExportJsonModal = false" @success="handleExportJsonSuccess" @error="handleExportJsonError" />

    <ConfirmModal :is-open="showDeleteConfirm" :title="t('transactions.deleteTransaction')"
      :message="t('transactions.deleteTransactionConfirm')" confirm-text="Delete" variant="danger"
      @confirm="confirmDelete" @close="showDeleteConfirm = false" />
  </div>
</template>
