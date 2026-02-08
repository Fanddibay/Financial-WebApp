<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import AlertModal from '@/components/ui/AlertModal.vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import ReceiptScanner from '@/components/transactions/ReceiptScanner.vue'
import TextInputModal from '@/components/transactions/TextInputModal.vue'
import type { TransactionFormData } from '@/types/transaction'
import { useTransactions } from '@/composables/useTransactions'
import {
  useAddTransactionFlow,
  type AddTransactionPayload,
} from '@/composables/useAddTransactionFlow'
import { usePocketLimits } from '@/composables/usePocketLimits'
import { usePocketStore } from '@/stores/pocket'
import { useGoalStore } from '@/stores/goal'
import { useTransactionStore } from '@/stores/transaction'
import { useTokenStore } from '@/stores/token'
import { MAIN_POCKET_ID } from '@/services/pocketService'
import { formatIDR } from '@/utils/currency'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

interface Props {
  isOpen: boolean
  /** When adding from a pocket detail, lock transactions to this pocket. */
  lockedPocketId?: string
  /** When adding from a goal detail, lock transactions to this goal. */
  lockedGoalId?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
}>()

const route = useRoute()
const router = useRouter()
const pocketStore = usePocketStore()
const goalStore = useGoalStore()
const txStore = useTransactionStore()
const tokenStore = useTokenStore()
const { categories, createTransaction, fetchTransactions } = useTransactions()
const { successThenRedirect } = useAddTransactionFlow()
const { getActivePockets } = usePocketLimits()

const showScanner = ref(false)
const showTextInput = ref(false)
const step = ref<'select' | 'options'>('select')
const selectedPocketId = ref<string | null>(null)
const selectedGoalId = ref<string | null>(null)
const searchPocketQuery = ref('')
const searchGoalQuery = ref('')
const destinationTab = ref<'pocket' | 'goal'>('pocket')
const originRoute = ref('')

const showInsufficientBalanceModal = ref(false)
const insufficientBalanceMessage = ref('')

const activePockets = computed(() =>
  getActivePockets(pocketStore.pockets, tokenStore.isLicenseActive),
)
const hasMultiplePockets = computed(() => activePockets.value.length > 1)
const singlePocketId = computed(() =>
  activePockets.value.length === 1 ? (activePockets.value[0]?.id ?? null) : null,
)

const showSelectStep = computed(
  () => hasMultiplePockets.value && !props.lockedPocketId && !props.lockedGoalId,
)

const effectivePocketId = computed(
  () =>
    props.lockedPocketId ||
    selectedPocketId.value ||
    singlePocketId.value ||
    MAIN_POCKET_ID,
)

const effectiveGoalId = computed(() => props.lockedGoalId || selectedGoalId.value || undefined)

const isGoalSelected = computed(() => !!selectedGoalId.value)

const isLockedInvestmentGoal = computed(() => {
  const id = effectiveGoalId.value
  return id ? goalStore.getGoalById(id)?.type === 'investment' : false
})

const pocketsWithBalances = computed(() => {
  const balances = txStore.pocketBalances
  return activePockets.value.map((p) => ({
    ...p,
    balance: balances[p.id] ?? 0,
  }))
})

const filteredPocketsForSelect = computed(() => {
  const q = searchPocketQuery.value.trim().toLowerCase()
  const list = pocketsWithBalances.value
  if (!q) return list
  return list.filter((p) => p.name.toLowerCase().includes(q))
})

const goalsWithBalances = computed(() => goalStore.goalsWithBalances)

const filteredGoalsForSelect = computed(() => {
  const q = searchGoalQuery.value.trim().toLowerCase()
  const list = goalsWithBalances.value
  if (!q) return list
  return list.filter((g) => g.name.toLowerCase().includes(q))
})

const sheetTitle = computed(() => {
  if (showSelectStep.value && step.value === 'select') {
    return destinationTab.value === 'pocket'
      ? t('transaction.selectPocketStepTitle')
      : t('goal.selectGoalStepTitle')
  }
  return t('transaction.addTransaction')
})

const sheetSubtitle = computed(() => {
  if (showSelectStep.value && step.value === 'select') {
    return destinationTab.value === 'pocket'
      ? t('transaction.selectPocketStepSubtitle')
      : t('goal.selectGoalStepSubtitle')
  }
  if (isGoalSelected.value) {
    return t('goal.addTransactionToGoalDesc')
  }
  return t('transaction.addTransactionDesc')
})

const showOptionsView = computed(
  () => (showSelectStep.value && step.value === 'options') || !showSelectStep.value,
)
const showChangePocketLink = computed(() => showSelectStep.value && step.value === 'options')

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      originRoute.value = route.fullPath
      pocketStore.fetchPockets()
      goalStore.fetchGoals()
      fetchTransactions()
      if (props.lockedGoalId) {
        // If locked to a goal, skip selection and go directly to options
        selectedGoalId.value = props.lockedGoalId
        step.value = 'options'
        destinationTab.value = 'goal'
      } else {
        step.value = showSelectStep.value ? 'select' : 'options'
        selectedPocketId.value = null
        selectedGoalId.value = null
        destinationTab.value = 'pocket'
      }
      searchPocketQuery.value = ''
      searchGoalQuery.value = ''
    }
  },
)

function selectPocket(id: string) {
  selectedPocketId.value = id
  selectedGoalId.value = null
  step.value = 'options'
}

function selectGoal(id: string) {
  selectedGoalId.value = id
  selectedPocketId.value = null
  step.value = 'options'
}

function handleAddByForm() {
  emit('close')
  const q: Record<string, string> = { returnTo: originRoute.value || '/' }
  if (isGoalSelected.value && effectiveGoalId.value) {
    q.goalId = effectiveGoalId.value
    // For goals, we still need a pocketId (can be main pocket)
    q.pocketId = effectivePocketId.value
  } else if (effectivePocketId.value) {
    q.pocketId = effectivePocketId.value
  }
  router.push({ path: '/transactions/new', query: q })
}

function handleAddByScan() {
  // Scan is disabled for Goals
  if (isGoalSelected.value) return
  showScanner.value = true
}

function handleAddByText() {
  showTextInput.value = true
}

async function handleScanComplete(data: Omit<TransactionFormData, 'pocketId'>) {
  try {
    const pocketId = effectivePocketId.value
    const goalId = effectiveGoalId.value || undefined
    await createTransaction({ ...data, pocketId, ...(goalId && { goalId }) })
    fetchTransactions()
    showScanner.value = false
    emit('close')
    const pl: AddTransactionPayload = {
      pocketId,
      amount: data.amount,
      type: data.type as 'income' | 'expense',
    }
    successThenRedirect(originRoute.value || '/', pl)
  } catch (error: unknown) {
    const err = error as Error & { currentBalance?: number; amount?: number }
    if (err.message === 'INSUFFICIENT_POCKET_BALANCE' && err.currentBalance != null && err.amount != null) {
      insufficientBalanceMessage.value = t('pocket.insufficientBalanceMessage', {
        balance: formatIDR(err.currentBalance),
        amount: formatIDR(err.amount),
      })
      showInsufficientBalanceModal.value = true
      return
    }
    console.error('Error creating transaction:', error)
  }
}

async function handleScanCompleteMultiple(
  data: Omit<TransactionFormData, 'pocketId'>[],
) {
  try {
    const pocketId = effectivePocketId.value
    const goalId = effectiveGoalId.value || undefined
    for (const d of data) {
      await createTransaction({ ...d, pocketId, ...(goalId && { goalId }) })
    }
    fetchTransactions()
    showScanner.value = false
    emit('close')
    successThenRedirect(originRoute.value || '/', { multi: true, count: data.length })
  } catch (error: unknown) {
    const err = error as Error & { currentBalance?: number; amount?: number }
    if (err.message === 'INSUFFICIENT_POCKET_BALANCE' && err.currentBalance != null && err.amount != null) {
      insufficientBalanceMessage.value = t('pocket.insufficientBalanceMessage', {
        balance: formatIDR(err.currentBalance),
        amount: formatIDR(err.amount),
      })
      showInsufficientBalanceModal.value = true
      return
    }
    console.error('Error creating transactions:', error)
  }
}

function handleClose() {
  showScanner.value = false
  showTextInput.value = false
  step.value = 'select'
  selectedPocketId.value = null
  selectedGoalId.value = null
  destinationTab.value = 'pocket'
  emit('close')
}

function handleCancel() {
  handleClose()
}

function backToSelectPocket() {
  step.value = 'select'
  selectedPocketId.value = null
  selectedGoalId.value = null
}

function handleTextInputEdit() {
  showTextInput.value = false
  emit('close')
}

function handleTextInputSubmit(payload?: AddTransactionPayload) {
  showTextInput.value = false
  emit('close')
  successThenRedirect(originRoute.value || '/', payload)
}
</script>

<template>
  <!-- Always use BottomSheet (slide-up from bottom). Multi-pocket: select → options; single/locked: options only. -->
  <BottomSheet :is-open="isOpen" :title="sheetTitle" :subtitle="sheetSubtitle" @close="handleClose">
    <template v-if="showSelectStep && step === 'select'" #headerBottom>
      <!-- Tabs for Pocket/Goals -->
      <div class="mb-3 flex gap-2 border-b border-slate-200 dark:border-slate-700">
        <button
          type="button"
          :class="[
            'flex-1 py-2 text-sm font-medium transition-colors',
            destinationTab === 'pocket'
              ? 'border-b-2 border-brand text-brand'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300',
          ]"
          @click="destinationTab = 'pocket'"
        >
          💼 {{ t('goal.tabPocket') }}
        </button>
        <button
          type="button"
          :class="[
            'flex-1 py-2 text-sm font-medium transition-colors',
            destinationTab === 'goal'
              ? 'border-b-2 border-brand text-brand'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300',
          ]"
          @click="destinationTab = 'goal'"
        >
          🎯 {{ t('goal.tabGoal') }}
        </button>
      </div>
      <!-- Search bar -->
      <div class="relative">
        <font-awesome-icon :icon="['fas', 'search']"
          class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          v-if="destinationTab === 'pocket'"
          v-model="searchPocketQuery"
          type="text"
          :placeholder="t('pocket.searchPockets')"
          class="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
        <input
          v-else
          v-model="searchGoalQuery"
          type="text"
          :placeholder="t('goal.searchGoals')"
          class="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
      </div>
    </template>
    <!-- Step 1: Select destination (Pocket or Goal) -->
    <div v-if="showSelectStep && step === 'select'" class="space-y-2">
      <!-- Pocket list -->
      <template v-if="destinationTab === 'pocket'">
      <button v-for="p in filteredPocketsForSelect" :key="p.id" type="button"
        class="flex w-full items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600 dark:hover:bg-slate-800/80"
        @click="selectPocket(p.id)">
        <div
          class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-2xl dark:bg-slate-700">
          {{ p.icon }}
        </div>
        <div class="min-w-0 flex-1">
          <p class="truncate font-semibold text-slate-900 dark:text-slate-100">
            {{ p.name }}
          </p>
          <p class="text-sm text-slate-500 dark:text-slate-400">
            {{ formatIDR(p.balance) }}
          </p>
        </div>
        <span class="shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400">
          {{ t(`pocket.type${p.type === 'main' ? 'Main' : p.type.charAt(0).toUpperCase() + p.type.slice(1)}`) }}
        </span>
        <font-awesome-icon :icon="['fas', 'chevron-right']" class="h-4 w-4 shrink-0 text-slate-400" />
      </button>
        <p v-if="filteredPocketsForSelect.length === 0"
          class="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
          {{ searchPocketQuery.trim() ? t('pocket.noSearchResults') : t('pocket.noPocketsYetDesc') }}
        </p>
      </template>
      <!-- Goal list -->
      <template v-else>
        <button
          v-for="g in filteredGoalsForSelect"
          :key="g.id"
          type="button"
          class="flex w-full items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600 dark:hover:bg-slate-800/80"
          @click="selectGoal(g.id)"
        >
          <div
            class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-2xl dark:bg-slate-700"
          >
            {{ g.icon }}
          </div>
          <div class="min-w-0 flex-1">
            <p class="truncate font-semibold text-slate-900 dark:text-slate-100">
              {{ g.name }}
            </p>
            <p class="text-sm text-slate-500 dark:text-slate-400">
              {{ formatIDR(g.currentBalance) }} / {{ formatIDR(g.targetAmount) }}
            </p>
            <div class="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                class="h-full bg-brand transition-all"
                :style="{ width: `${Math.min(100, (g.currentBalance / g.targetAmount) * 100)}%` }"
              />
            </div>
          </div>
          <font-awesome-icon :icon="['fas', 'chevron-right']" class="h-4 w-4 shrink-0 text-slate-400" />
        </button>
        <p v-if="filteredGoalsForSelect.length === 0"
          class="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
          {{ searchGoalQuery.trim() ? t('goal.noSearchResults') : t('goal.noGoalsYetDesc') }}
        </p>
      </template>
    </div>

    <!-- Options: 3 transaction methods. "Ganti kantong/goal" only when multi-pocket/goal step 2. -->
    <div v-else-if="showOptionsView" class="space-y-2 py-1">
      <button v-if="showChangePocketLink" type="button"
        class="flex items-center gap-2 py-1 text-sm font-medium text-brand hover:underline dark:text-brand-light"
        @click="backToSelectPocket">
        <font-awesome-icon :icon="['fas', 'chevron-left']" class="h-4 w-4" />
        {{ isGoalSelected ? t('goal.changeGoal') : t('transaction.changePocket') }}
      </button>
      <!-- Info message for Goals -->
      <div v-if="isGoalSelected" class="rounded-lg bg-blue-50 px-4 py-3 dark:bg-blue-900/20">
        <p class="text-sm text-blue-900 dark:text-blue-200">
          {{ t('goal.addTransactionToGoalInfo') }}
        </p>
      </div>
      <div class="space-y-2">
        <BaseCard>
          <button type="button"
            class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800"
            @click="handleAddByForm">
            <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
              <font-awesome-icon :icon="['fas', 'edit']" class="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div class="min-w-0 flex-1">
              <h3 class="font-semibold text-slate-900 dark:text-slate-100">
                {{ t('transaction.addViaForm') }}
              </h3>
              <p class="mt-0.5 text-sm leading-snug text-slate-500 dark:text-slate-400">
                {{ t('transaction.addViaFormDesc') }}
              </p>
            </div>
            <font-awesome-icon :icon="['fas', 'chevron-right']" class="h-4 w-4 shrink-0 text-slate-400" />
          </button>
        </BaseCard>
        <!-- Scan and text-input disabled for Goals; text-input also disabled for Investment goals -->
        <BaseCard v-if="!effectiveGoalId">
          <button type="button"
            class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800"
            @click="handleAddByScan">
            <div
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <font-awesome-icon :icon="['fas', 'camera']" class="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <div class="min-w-0 flex-1">
              <h3 class="font-semibold text-slate-900 dark:text-slate-100">
                {{ t('transaction.scanReceipt') }}
              </h3>
              <p class="mt-0.5 text-sm leading-snug text-slate-500 dark:text-slate-400">
                {{ t('transaction.scanReceiptDesc') }}
              </p>
            </div>
            <font-awesome-icon :icon="['fas', 'chevron-right']" class="h-4 w-4 shrink-0 text-slate-400" />
          </button>
        </BaseCard>
        <BaseCard v-if="!isLockedInvestmentGoal">
          <button type="button"
            class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800"
            @click="handleAddByText">
            <div
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
              <font-awesome-icon :icon="['fas', 'keyboard']" class="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div class="min-w-0 flex-1">
              <h3 class="font-semibold text-slate-900 dark:text-slate-100">
                {{ t('transaction.textInput') }}
              </h3>
              <p class="mt-0.5 text-sm leading-snug text-slate-500 dark:text-slate-400">
                {{ t('transaction.textInputDesc') }}
              </p>
            </div>
            <font-awesome-icon :icon="['fas', 'chevron-right']" class="h-4 w-4 shrink-0 text-slate-400" />
          </button>
        </BaseCard>
      </div>
    </div>

    <template v-if="showOptionsView" #footer>
      <div class="flex justify-end">
        <BaseButton variant="secondary" @click="handleCancel">
          {{ t('common.cancel') }}
        </BaseButton>
      </div>
    </template>
  </BottomSheet>

  <ReceiptScanner :is-open="showScanner" :categories="categories" @close="showScanner = false"
    @navigate-away="handleClose" @scan-complete="handleScanComplete"
    @scan-complete-multiple="handleScanCompleteMultiple" />
  <TextInputModal
    :is-open="showTextInput"
    :locked-pocket-id="effectivePocketId"
    :locked-goal-id="effectiveGoalId"
    :origin-route="originRoute"
    @close="showTextInput = false"
    @edit-navigate="handleTextInputEdit"
    @submit-complete="handleTextInputSubmit"
  />

  <AlertModal
    :is-open="showInsufficientBalanceModal"
    :title="t('pocket.insufficientBalanceTitle')"
    :message="insufficientBalanceMessage"
    variant="warning"
    @close="showInsufficientBalanceModal = false"
  />
</template>
