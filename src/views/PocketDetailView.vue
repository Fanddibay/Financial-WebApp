<script setup lang="ts">
import { computed, onMounted, provide, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePocketLimits } from '@/composables/usePocketLimits'
import { usePocketStore } from '@/stores/pocket'
import { useTransactionStore } from '@/stores/transaction'
import { useToastStore } from '@/stores/toast'
import { useTokenStore } from '@/stores/token'
import AddTransactionModal from '@/components/transactions/AddTransactionModal.vue'
import MoveMoneyModal from '@/components/pockets/MoveMoneyModal.vue'
import PocketActionMenu from '@/components/pockets/PocketActionMenu.vue'
import EditPocketModal from '@/components/pockets/EditPocketModal.vue'
import DeletePocketModal from '@/components/pockets/DeletePocketModal.vue'
import ExportPocketJsonModal from '@/components/pockets/ExportPocketJsonModal.vue'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import TransactionCard from '@/components/transactions/TransactionCard.vue'
import ExpenseChart from '@/components/charts/ExpenseChart.vue'
import { exportToCSV } from '@/utils/export'
import { formatIDR } from '@/utils/currency'
import { getCategoryIcon } from '@/utils/categoryIcons'
import { MAIN_POCKET_ID } from '@/services/pocketService'
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

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const pocketStore = usePocketStore()
const txStore = useTransactionStore()
const toastStore = useToastStore()
const tokenStore = useTokenStore()
const { isPocketDisabled } = usePocketLimits()

const pocketId = computed(() => {
  const id = route.params.id
  return typeof id === 'string' ? id : Array.isArray(id) ? id[0] : ''
})

const pocket = computed(() => (pocketId.value ? pocketStore.getPocketById(pocketId.value) : null))

const balance = computed(() => {
  if (!pocketId.value) return 0
  return txStore.pocketBalances[pocketId.value] ?? 0
})

const showBalance = ref(true)
const activeTab = ref<'transactions' | 'overview'>('transactions')
const showAddModal = ref(false)
const showMoveModal = ref(false)
const showDeleteConfirm = ref(false)
const transactionToDelete = ref<string | null>(null)
const showActionMenu = ref(false)
const showEditPocketModal = ref(false)
const showDeletePocketModal = ref(false)
const showExportJsonModal = ref(false)

const transactionMenuOpenId = ref<string | null>(null)
provide('transactionMenuOpenId', transactionMenuOpenId)
provide('transactionMenuSetOpenId', (id: string | null) => {
  transactionMenuOpenId.value = id
})

const insufficientForMove = computed(() => balance.value <= 0)

const pocketTransactions = computed(() => {
  const id = pocketId.value
  if (!id) return []
  return txStore.transactions
    .filter((tx) => tx.pocketId === id || tx.transferToPocketId === id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
})

const latestSeven = computed(() => pocketTransactions.value.slice(0, 7))

const pocketNames = computed(() => {
  const map: Record<string, string> = {}
  pocketStore.pockets.forEach((p) => { map[p.id] = p.name })
  return map
})

const typeLabelKeys: Record<string, string> = {
  main: 'typeMain',
  spending: 'typeSpending',
  saving: 'typeSaving',
  investment: 'typeInvestment',
}
const pocketTypeLabel = computed(() => {
  const p = pocket.value
  if (!p) return ''
  const key = typeLabelKeys[p.type] ?? 'typeMain'
  return t(`pocket.${key}`)
})

const headerBg = computed(() => pocket.value?.color ?? DEFAULT_POCKET_COLOR)
const isDarkHeader = computed(() => luminance(headerBg.value) < 0.4)

const pocketDisabled = computed(() =>
  !!pocketId.value &&
  isPocketDisabled(pocketId.value, pocketStore.pockets, tokenStore.isLicenseActive),
)

// Overview tab: categories from this pocket only (income + expense, exclude transfer)
const overviewIncome = computed(() => pocketTransactions.value.filter((tx) => tx.type === 'income'))
const overviewExpense = computed(() => pocketTransactions.value.filter((tx) => tx.type === 'expense'))

const overviewIncomeByCategory = computed(() => {
  const m = new Map<string, { total: number; count: number }>()
  overviewIncome.value.forEach((tx) => {
    if (!tx.category) return
    const cur = m.get(tx.category) ?? { total: 0, count: 0 }
    m.set(tx.category, { total: cur.total + tx.amount, count: cur.count + 1 })
  })
  return Array.from(m.entries())
    .map(([category, data]) => ({ category, ...data }))
    .sort((a, b) => b.total - a.total)
})

const overviewExpenseByCategory = computed(() => {
  const m = new Map<string, { total: number; count: number }>()
  overviewExpense.value.forEach((tx) => {
    if (!tx.category) return
    const cur = m.get(tx.category) ?? { total: 0, count: 0 }
    m.set(tx.category, { total: cur.total + tx.amount, count: cur.count + 1 })
  })
  return Array.from(m.entries())
    .map(([category, data]) => ({ category, ...data }))
    .sort((a, b) => b.total - a.total)
})

const overviewAllCategories = computed(() => {
  const incomeLabel = `(${t('transaction.incomeLabel')})`
  const expenseLabel = `(${t('transaction.expenseLabel')})`
  const income = overviewIncomeByCategory.value.map((item) => ({
    ...item,
    category: `${item.category} ${incomeLabel}`,
  }))
  const expense = overviewExpenseByCategory.value.map((item) => ({
    ...item,
    category: `${item.category} ${expenseLabel}`,
  }))
  return [...income, ...expense].sort((a, b) => b.total - a.total)
})

const overviewChartBalance = computed(() => balance.value)

const chartColors = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
]

function getCategoryColor(index: number) {
  return chartColors[index % chartColors.length]
}

function getCategoryIconForDisplay(category: string): string {
  const incomeLabel = `(${t('transaction.incomeLabel')})`
  const expenseLabel = `(${t('transaction.expenseLabel')})`
  if (category.includes(incomeLabel)) {
    const base = category.replace(` ${incomeLabel}`, '').trim()
    return getCategoryIcon(base, 'income')
  }
  if (category.includes(expenseLabel)) {
    const base = category.replace(` ${expenseLabel}`, '').trim()
    return getCategoryIcon(base, 'expense')
  }
  return getCategoryIcon(category, 'expense')
}

function goBack() {
  router.back()
}

function handleAddTransaction() {
  showAddModal.value = true
}

function handleMoveMoney() {
  if (insufficientForMove.value) return
  showMoveModal.value = true
}

function handleExportCSV() {
  const list = pocketTransactions.value
  const name = pocket.value?.name ?? 'pocket'
  const filename = `transactions-${name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`
  exportToCSV(list, { includePocket: true, pocketNames: pocketNames.value }, filename)
}

function handleSeeAllTransactions() {
  router.push({ path: '/transactions', query: { pocketId: pocketId.value } })
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

function handleMoveSuccess() {
  txStore.fetchTransactions()
}

function handleEditPocketSaved(data: { name: string; icon: string; color: string }) {
  if (!pocketId.value) return
  pocketStore.updatePocket(pocketId.value, data)
  showEditPocketModal.value = false
  toastStore.success(t('pocket.editSuccess'))
}

async function handleDeletePocketConfirm() {
  if (!pocketId.value || !pocket.value) return
  if (pocket.value.id === MAIN_POCKET_ID) return
  await txStore.deleteByPocketId(pocketId.value)
  pocketStore.deletePocket(pocketId.value)
  showDeletePocketModal.value = false
  router.replace('/')
  toastStore.success(t('pocket.deleteSuccess'))
}

function handleExportJsonSuccess(message: string) {
  toastStore.success(message)
  showExportJsonModal.value = false
}

function handleExportJsonError(message: string) {
  toastStore.error(message)
}

onMounted(() => {
  pocketStore.fetchPockets()
  txStore.fetchTransactions()
})
</script>

<template>
  <div class="mx-auto max-w-[430px] space-y-6  pb-12" :class="pocket ? 'pt-0' : 'pt-4'">
    <div v-if="!pocket" class="py-12 text-center text-slate-500 dark:text-slate-400">
      <p>{{ t('pocket.selectPocket') }}</p>
      <button type="button" class="mt-4 rounded-lg bg-brand px-4 py-2 font-medium text-white hover:bg-brand-dark"
        @click="router.push('/')">
        {{ t('nav.home') }}
      </button>
    </div>

    <!-- Disabled pocket (Basic, >2): direct URL / bookmark -->
    <div v-else-if="pocketDisabled" class="space-y-6">
      <header
        class="sticky top-0 z-10 -mx-4 flex items-center gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
        <button type="button"
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          :aria-label="t('nav.back')" @click="goBack">
          <font-awesome-icon :icon="['fas', 'chevron-left']" class="h-5 w-5" />
        </button>
        <h1 class="truncate text-lg font-semibold text-slate-900 dark:text-slate-100">
          {{ t('pocket.disabled.title') }}
        </h1>
      </header>
      <div class="flex flex-col items-center gap-6 py-8">
        <div
          class="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:bg-amber-400/20 dark:text-amber-400">
          <font-awesome-icon :icon="['fas', 'wallet']" class="h-9 w-9" />
          <span
            class="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-slate-700 text-white dark:bg-slate-600">
            <font-awesome-icon :icon="['fas', 'lock']" class="h-3.5 w-3.5" />
          </span>
        </div>
        <p class="text-center text-sm text-slate-600 dark:text-slate-400">
          {{ t('pocket.disabled.description') }}
        </p>
        <div class="flex w-full max-w-xs flex-col gap-3">
          <BaseButton class="w-full" size="lg" @click="router.push({ path: '/profile', hash: '#license' })">
            {{ t('pocket.disabled.upgrade') }}
          </BaseButton>
          <BaseButton variant="secondary" class="w-full" @click="router.push('/')">
            {{ t('pocket.disabled.backHome') }}
          </BaseButton>
        </div>
      </div>
    </div>

    <template v-else>
      <!-- Flex layout: fixed top (no scroll), only tab content scrolls -->
      <div class="flex h-[calc(100dvh-5.5rem)] min-h-[280px] flex-col overflow-hidden">
        <!-- Fixed top section (never scrolls) -->
        <div class="flex shrink-0 flex-col gap-4 ">
          <!-- Header: full pocket color, no gap top/left/right. -mx-4 edge-to-edge; safe-area for content -->
          <div class="-mx-4 rounded-t-2xl pb-6 pt-[max(1rem,env(safe-area-inset-top))] px-8"
            :style="{ backgroundColor: headerBg }">
            <!-- Top row: Back | 3-dots -->
            <div class="flex items-center justify-between">
              <button type="button" :class="[
                'flex h-10 w-10 items-center justify-center rounded-full transition',
                isDarkHeader
                  ? 'text-white/90 hover:bg-white/20 hover:text-white'
                  : 'text-slate-600 hover:bg-black/10 hover:text-slate-900',
              ]" :aria-label="t('nav.home')" @click="goBack">
                <font-awesome-icon :icon="['fas', 'chevron-left']" class="h-5 w-5" />
              </button>
              <button type="button" :class="[
                'flex h-10 w-10 items-center justify-center rounded-full transition',
                isDarkHeader
                  ? 'text-white/90 hover:bg-white/20 hover:text-white'
                  : 'text-slate-600 hover:bg-black/10 hover:text-slate-900',
              ]" :aria-label="t('pocket.actionMenuTitle')" @click="showActionMenu = true">
                <font-awesome-icon :icon="['fas', 'ellipsis-vertical']" class="h-5 w-5" />
              </button>
            </div>

            <!-- Pocket: icon + type + name + balance -->
            <div class="mt-4 flex items-start gap-4">
              <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl shadow-sm"
                :class="isDarkHeader ? 'bg-white/20' : 'bg-white/90'">
                {{ pocket.icon }}
              </div>
              <div class="min-w-0 flex-1">
                <p :class="[
                  'text-sm font-medium',
                  isDarkHeader ? 'text-white/70' : 'text-slate-600',
                ]">
                  {{ pocketTypeLabel }}
                </p>
                <h1 :class="[
                  'mt-0.5 truncate text-xl font-bold',
                  isDarkHeader ? 'text-white' : 'text-slate-900',
                ]">
                  {{ pocket.name }}
                </h1>
              </div>
            </div>
            <div class="mt-4 flex items-center gap-4">
              <p :class="[
                'min-w-0 flex-1 text-2xl font-bold tracking-tight',
                isDarkHeader ? 'text-white' : 'text-slate-900',
              ]">
                {{ showBalance ? formatIDR(balance) : '••••••••' }}
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

          <!-- Action buttons: Add Transaction | Move Money | Export CSV -->
          <div class="grid grid-cols-3 gap-2 px-4">
            <button type="button"
              class="flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-slate-200 bg-white py-3 transition hover:border-brand/40 hover:bg-brand/5 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-brand/40"
              @click="handleAddTransaction">
              <font-awesome-icon :icon="['fas', 'plus']" class="h-5 w-5 text-brand" />
              <span class="text-xs font-medium text-slate-700 dark:text-slate-300">{{ t('pocket.addTransaction')
              }}</span>
            </button>
            <button type="button" :disabled="insufficientForMove"
              class="flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-slate-200 bg-white py-3 transition hover:border-brand/40 hover:bg-brand/5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-slate-200 disabled:hover:bg-white dark:border-slate-700 dark:bg-slate-800 dark:hover:border-brand/40 dark:disabled:hover:border-slate-700 dark:disabled:hover:bg-slate-800"
              @click="handleMoveMoney">
              <font-awesome-icon :icon="['fas', 'arrow-right-arrow-left']"
                class="h-5 w-5 text-slate-600 dark:text-slate-400" />
              <span class="text-xs font-medium text-slate-700 dark:text-slate-300">{{ t('pocket.moveMoney') }}</span>
            </button>
            <button type="button"
              class="flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-slate-200 bg-white py-3 transition hover:border-brand/40 hover:bg-brand/5 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-brand/40"
              @click="handleExportCSV">
              <font-awesome-icon :icon="['fas', 'file-excel']" class="h-5 w-5 text-slate-600 dark:text-slate-400" />
              <span class="text-xs font-medium text-slate-700 dark:text-slate-300">{{ t('pocket.exportCSV') }}</span>
            </button>
          </div>

          <p v-if="insufficientForMove"
            class="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
            {{ t('pocket.moveMoneyInsufficientDesc') }}
          </p>

          <!-- Tabs -->
          <div class="shrink-0 border-b border-slate-200 dark:border-slate-700">
            <div class="flex gap-1">
              <button type="button" :class="[
                'flex-1 rounded-t-lg px-4 py-3 text-sm font-medium transition',
                activeTab === 'transactions'
                  ? 'bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-slate-100'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300',
              ]" @click="activeTab = 'transactions'">
                {{ t('pocket.tabTransactions') }}
              </button>
              <button type="button" :class="[
                'flex-1 rounded-t-lg px-4 py-3 text-sm font-medium transition',
                activeTab === 'overview'
                  ? 'bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-slate-100'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300',
              ]" @click="activeTab = 'overview'">
                {{ t('pocket.tabOverview') }}
              </button>
            </div>
          </div>
        </div>

        <!-- Scrollable tab content: extend to bottom nav; pb-24 so last items visible above nav -->
        <div class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pt-4 pb-4 px-4"
          style="scroll-behavior: smooth; -webkit-overflow-scrolling: touch;">
          <!-- Tab: Transactions -->
          <div v-show="activeTab === 'transactions'" class="space-y-4">
            <div v-if="latestSeven.length === 0" class="py-8 text-center text-slate-500 dark:text-slate-400">
              <p>{{ t('transactions.noTransactions') }}</p>
            </div>
            <div v-else class="space-y-3">
              <TransactionCard v-for="tx in latestSeven" :key="tx.id" :transaction="tx" :context-pocket-id="pocketId"
                @edit="handleEdit" @delete="handleDelete" />
            </div>
            <button v-if="pocketTransactions.length > 0" type="button"
              class="w-full rounded-xl border-2 border-dashed border-slate-200 py-3 text-sm font-medium text-slate-600 transition hover:border-brand/40 hover:bg-brand/5 hover:text-brand dark:border-slate-600 dark:text-slate-400 dark:hover:border-brand/40"
              @click="handleSeeAllTransactions">
              {{ t('pocket.seeAllTransactions') }}
            </button>
          </div>

          <!-- Tab: Overview -->
          <div v-show="activeTab === 'overview'" class="space-y-6">
            <div v-if="overviewAllCategories.length === 0" class="py-12 text-center text-slate-500 dark:text-slate-400">
              <font-awesome-icon :icon="['fas', 'chart-pie']" class="mx-auto mb-3 block h-12 w-12 text-slate-400" />
              <p>{{ t('home.noTransactions') }}</p>
              <p class="mt-1 text-sm">{{ t('home.noTransactionsDesc') }}</p>
            </div>
            <template v-else>
              <div class="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/50">
                <ExpenseChart :transactions-by-category="overviewAllCategories"
                  :all-categories-for-color-mapping="overviewAllCategories" :total-expenses="overviewChartBalance"
                  :label="t('home.balance')" :is-negative="overviewChartBalance < 0" :is-expense="false" />
              </div>
              <div class="space-y-3">
                <p class="text-sm font-semibold text-slate-700 dark:text-slate-300">{{ t('home.categoryBreakdown') }}
                </p>
                <div class="grid grid-cols-2 gap-3">
                  <div v-for="(item, index) in overviewAllCategories" :key="item.category"
                    class="rounded-xl border-2 border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800/50">
                    <div class="mb-2 h-1.5 w-full rounded-full" :style="{ backgroundColor: getCategoryColor(index) }" />
                    <div class="flex items-center gap-1.5">
                      <span class="text-sm">{{ getCategoryIconForDisplay(item.category) }}</span>
                      <p class="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {{ item.category }}
                      </p>
                    </div>
                    <p class="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">
                      {{ formatIDR(item.total) }}
                    </p>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </template>

    <AddTransactionModal :is-open="showAddModal" :locked-pocket-id="pocketId" @close="handleAddModalClose" />

    <MoveMoneyModal :is-open="showMoveModal" :pocket-id="pocket?.id ?? ''" :pocket-name="pocket?.name ?? ''"
      :available-balance="balance" @close="showMoveModal = false" @success="handleMoveSuccess" />

    <PocketActionMenu :is-open="showActionMenu" :pocket="pocket" @close="showActionMenu = false"
      @edit="showEditPocketModal = true" @download-json="showExportJsonModal = true"
      @delete="showDeletePocketModal = true" />

    <EditPocketModal :is-open="showEditPocketModal" :pocket="pocket" @close="showEditPocketModal = false"
      @saved="handleEditPocketSaved" />

    <DeletePocketModal :is-open="showDeletePocketModal" :pocket="pocket" @close="showDeletePocketModal = false"
      @confirm="handleDeletePocketConfirm" />

    <ExportPocketJsonModal :is-open="showExportJsonModal" :pocket="pocket" :pocket-transactions="pocketTransactions"
      @close="showExportJsonModal = false" @success="handleExportJsonSuccess" @error="handleExportJsonError" />

    <ConfirmModal :is-open="showDeleteConfirm" :title="t('home.deleteTransaction')"
      :message="t('home.deleteTransactionConfirm')" :confirm-text="t('common.delete')" :cancel-text="t('common.cancel')"
      variant="danger" :icon="['fas', 'trash']" @confirm="confirmDelete" @close="showDeleteConfirm = false" />
  </div>
</template>
