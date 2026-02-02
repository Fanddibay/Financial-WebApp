<script setup lang="ts">
import { computed, onMounted, provide, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useTransactions } from '@/composables/useTransactions'
import { useProfileStore } from '@/stores/profile'
import TransactionCard from '@/components/transactions/TransactionCard.vue'
import AddTransactionModal from '@/components/transactions/AddTransactionModal.vue'
import WeeklyTransactionsBarChart from '@/components/charts/WeeklyTransactionsBarChart.vue'
import DailyActivitySheet from '@/components/home/DailyActivitySheet.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { formatIDR } from '@/utils/currency'
import { useI18n } from 'vue-i18n'
import { useGreeting } from '@/composables/useGreeting'

const { t } = useI18n()
const { greeting } = useGreeting()
const router = useRouter()
const profileStore = useProfileStore()
import type { Transaction } from '@/types/transaction'

const {
  transactions,
  pocketBalances,
  recentTransactions,
  fetchTransactions,
  deleteTransaction,
} = useTransactions()

// Local visibility states removed in favor of global profileStore.profile.showBalance
const showDeleteConfirm = ref(false)
const showDailyActivitySheet = ref(false)
const showAddModal = ref(false)

const displayName = computed(() => profileStore.profile.name || t('home.guest'))
const transactionToDelete = ref<string | null>(null)

const transactionMenuOpenId = ref<string | null>(null)
provide('transactionMenuOpenId', transactionMenuOpenId)
provide('transactionMenuSetOpenId', (id: string | null) => {
  transactionMenuOpenId.value = id
})

const totalBalanceAllPockets = computed(() => {
  const bal = pocketBalances.value
  return Object.values(bal).reduce((s, n) => s + n, 0)
})

const displayTotalBalance = computed(() =>
  profileStore.profile.showBalance ? formatIDR(totalBalanceAllPockets.value) : '••••••••',
)

const todayKey = computed(() => new Date().toISOString().split('T')[0])

const todayTransactions = computed(() =>
  transactions.value.filter((t) => t.date.split('T')[0] === todayKey.value),
)

const todaySummary = computed(() => {
  const list = todayTransactions.value
  const count = list.length
  const income = list.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expense = list.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  return { count, income, expense }
})

function handleTransactionClick(tx: Transaction) {
  if (tx.pocketId) {
    router.push({ name: 'pocket-detail', params: { id: tx.pocketId } })
  }
}

function handleAddTransaction() {
  showAddModal.value = true
}



function confirmDelete() {
  if (!transactionToDelete.value) return
  deleteTransaction(transactionToDelete.value)
  transactionToDelete.value = null
  showDeleteConfirm.value = false
}

function handleViewAll() {
  router.push('/transactions')
}

function openDailyActivity() {
  showDailyActivitySheet.value = true
}

onMounted(() => {
  fetchTransactions()
})
</script>

<template>
  <div class="mx-auto max-w-[430px] space-y-4 px-4 pb-28 pt-4">
    <!-- Main content: dashboard is always visible -->
    <!-- Greeting (di atas card ATM) -->
    <div class="px-1 pb-0">
      <p class="text-lg font-semibold text-slate-900 dark:text-slate-100">
        {{ greeting }}, {{ displayName }} 👋
      </p>
      <p class="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
        {{ t('home.subtitleActivity') }}
      </p>
    </div>

    <!-- Summary card: Total Saldo (theme accent + geometric pattern, content unchanged) -->
    <div
      class="relative overflow-hidden rounded-2xl border border-slate-200 shadow-sm ring-1 ring-slate-900/5 dark:border-slate-700 dark:ring-slate-700"
      role="region" aria-label="Total Saldo">
      <!-- Background: green theme ~half card + accent pattern (visible in light & dark) -->
      <div class="absolute inset-0 z-0">
        <!-- Top half: brand green (theme) -->
        <div class="absolute inset-x-0 top-0 h-1/2 bg-brand dark:bg-brand-dark" aria-hidden="true" />
        <!-- Smooth gradient seam between halves (taller = smoother) -->
        <div
          class="absolute left-0 right-0 top-[calc(50%-4px)] h-8 bg-gradient-to-b from-brand via-brand/80 to-white dark:from-brand-dark dark:via-brand-dark/90 dark:to-slate-800"
          aria-hidden="true" />
        <!-- Bottom half: white/slate -->
        <div class="absolute inset-x-0 bottom-0 h-1/2 bg-white dark:bg-slate-800" aria-hidden="true" />
        <!-- Geometric accent: visible in light (white on green) + dark -->
        <div class="absolute bottom-0 right-0 h-3/5 w-3/5 opacity-25 dark:opacity-[0.18]" aria-hidden="true">
          <svg viewBox="0 0 120 120" class="h-full w-full object-cover object-bottom-right" fill="none"
            xmlns="http://www.w3.org/2000/svg">
            <path d="M120 120 L120 40 L80 80 L60 60 L40 80 L0 120 Z" class="fill-white dark:fill-brand-light" />
            <path d="M100 120 L100 70 L70 100 L50 80 L20 120 Z" class="fill-white dark:fill-brand-light"
              opacity="0.85" />
            <path d="M80 120 L80 90 L50 120 Z" class="fill-white dark:fill-brand-light" opacity="0.7" />
            <path d="M0 120 L30 90 L50 110 L70 90 L90 120 Z" class="fill-white dark:fill-brand" opacity="0.5" />
          </svg>
        </div>
        <!-- Accent on white half (light mode): soft green tint bottom-right -->
        <div class="absolute bottom-0 right-0 h-1/3 w-2/3 rounded-tl-[3rem] bg-brand/10 dark:bg-transparent"
          aria-hidden="true" />
        <!-- Top-right accent: visible in light (white circle on green) -->
        <div
          class="absolute right-0 top-0 h-28 w-28 translate-x-10 -translate-y-10 rounded-full bg-white/25 dark:bg-brand/20"
          aria-hidden="true" />
      </div>

      <!-- Content (layout unchanged, hierarchy: white on green top half) -->
      <div class="relative z-10 px-5 py-5">
        <!-- Header: Total Saldo + show/hide balance (on green → white) -->
        <div class="flex items-center justify-between">
          <h2 class="text-base font-semibold text-white drop-shadow-sm">
            {{ t('home.totalBalance') }}
          </h2>
          <button type="button"
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/30 bg-white/20 text-white transition hover:bg-white/30 hover:text-white dark:border-white/20 dark:bg-white/15 dark:hover:bg-white/25"
            :aria-label="profileStore.profile.showBalance ? t('home.hideBalance') : t('home.showBalance')"
            @click="profileStore.updateProfile({ showBalance: !profileStore.profile.showBalance })">
            <font-awesome-icon :icon="['fas', profileStore.profile.showBalance ? 'eye-slash' : 'eye']"
              class="h-5 w-5" />
          </button>
        </div>

        <!-- Main balance (on green → white) -->
        <p class="mt-4 text-2xl font-bold tabular-nums text-white drop-shadow-sm sm:text-3xl">
          {{ displayTotalBalance }}
        </p>
        <!-- Sub-label: berapa kali transaksi hari ini (on green → white/90) -->
        <p class="mt-1.5 text-sm text-white/90 drop-shadow-sm">
          <template v-if="todaySummary.count === 0">
            {{ t('home.transactionsTodayCountZero') }}
          </template>
          <template v-else>
            {{ t('home.transactionsTodayCount', { count: todaySummary.count }) }}
          </template>
        </p>

        <!-- Pemasukan | Pengeluaran row -->
        <div class=" grid grid-cols-2 gap-4 rounded-xl py-2 mt-12">
          <div>
            <p class="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {{ t('home.pemasukan') }}
            </p>
            <p class="mt-0.5 text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400"
              :title="formatIDR(todaySummary.income)">
              {{ formatIDR(todaySummary.income) }}
            </p>
          </div>
          <div class="text-right">
            <p class="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {{ t('home.pengeluaran') }}
            </p>
            <p class="mt-0.5 text-lg font-bold tabular-nums text-rose-600 dark:text-rose-400"
              :title="formatIDR(todaySummary.expense)">
              {{ formatIDR(todaySummary.expense) }}
            </p>
          </div>
        </div>

        <!-- Button: Lihat aktivitas hari ini -->
        <BaseButton variant="primary" class="mt-5 w-full min-h-12 font-semibold" @click="openDailyActivity">
          <font-awesome-icon :icon="['fas', 'chart-line']" class="mr-2 h-5 w-5" />
          {{ t('home.viewDailyActivity') }}
        </BaseButton>
      </div>
    </div>

    <!-- Weekly Transactions Bar Chart -->
    <BaseCard>
      <template #header>
        <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {{ t('home.transactionsThisWeek') }}
        </h2>
      </template>
      <WeeklyTransactionsBarChart :transactions="transactions" />
    </BaseCard>

    <!-- Recent Transactions -->
    <BaseCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {{ t('home.recentTransactions') }}
          </h2>
          <button type="button" class="text-sm font-medium transition hover:text-brand dark:hover:text-brand/80"
            :class="recentTransactions.length ? 'text-brand dark:text-slate-400' : 'cursor-not-allowed text-slate-400 opacity-50 dark:text-slate-600'"
            :disabled="!recentTransactions.length" @click="handleViewAll">
            {{ t('home.viewAll') }}
          </button>
        </div>
      </template>
      <div v-if="recentTransactions.length" class="space-y-3">
        <TransactionCard v-for="tx in recentTransactions" :key="tx.id" :transaction="tx" :hide-actions="true"
          class="cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
          @click="handleTransactionClick(tx)" />
      </div>
      <!-- Empty state for recent transactions -->
      <div v-else
        class="flex flex-col items-center rounded-xl bg-slate-50/50 py-10 px-4 text-center dark:bg-slate-800/30">
        <span
          class="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl text-green-600 dark:bg-green-900/30 dark:text-green-400"
          aria-hidden="true">
          <font-awesome-icon :icon="['fas', 'receipt']" class="h-8 w-8" />
        </span>
        <h3 class="mt-2 font-semibold text-slate-900 dark:text-slate-100">
          {{ t('home.emptyNoTransactionsTitle') }}
        </h3>
        <p class="mt-1 max-w-xs text-sm text-slate-500 dark:text-slate-400">
          {{ t('home.emptyTransactionsStateTitle') }}
        </p>
        <BaseButton variant="primary" size="lg" class="mt-6 min-h-11 px-8 font-semibold" @click="handleAddTransaction">
          <font-awesome-icon :icon="['fas', 'plus']" class="mr-2" />
          {{ t('home.startTransaction') }}
        </BaseButton>
      </div>
    </BaseCard>

    <!-- Daily activity bottom sheet (today's transactions + insights) -->
    <DailyActivitySheet :is-open="showDailyActivitySheet" :transactions="todayTransactions"
      @close="showDailyActivitySheet = false" />

    <ConfirmModal :is-open="showDeleteConfirm" :title="t('home.deleteTransaction')"
      :message="t('home.deleteTransactionConfirm')" :confirm-text="t('common.delete')" variant="danger"
      @close="showDeleteConfirm = false; transactionToDelete = null" @confirm="confirmDelete" />

    <AddTransactionModal :is-open="showAddModal" @close="showAddModal = false" />
  </div>
</template>
