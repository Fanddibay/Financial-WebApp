<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import CurrencyInput from '@/components/ui/CurrencyInput.vue'
import { usePocketLimits } from '@/composables/usePocketLimits'
import { usePocketStore } from '@/stores/pocket'
import { useGoalStore } from '@/stores/goal'
import { useTransactionStore } from '@/stores/transaction'
import { useToastStore } from '@/stores/toast'
import { useTokenStore } from '@/stores/token'
import { formatIDR } from '@/utils/currency'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

interface Props {
  isOpen: boolean
  /** Current pocket (source) */
  pocketId: string
  pocketName: string
  /** Available balance in source pocket */
  availableBalance: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  success: []
}>()

const pocketStore = usePocketStore()
const goalStore = useGoalStore()
const txStore = useTransactionStore()
const toast = useToastStore()
const tokenStore = useTokenStore()
const { getActivePockets } = usePocketLimits()

const step = ref<1 | 2>(1)
const targetPocketId = ref('')
const targetGoalId = ref('')
const destinationTab = ref<'pocket' | 'goal'>('pocket')
const amount = ref(0)
const searchPocketQuery = ref('')
const searchGoalQuery = ref('')

const otherPockets = computed(() => {
  const active = getActivePockets(pocketStore.pockets, tokenStore.isLicenseActive)
  const list = active.filter((p) => p.id !== props.pocketId)
  const balances = txStore.pocketBalances
  return list.map((p) => ({ ...p, balance: balances[p.id] ?? 0 }))
})

const filteredOtherPockets = computed(() => {
  const q = searchPocketQuery.value.trim().toLowerCase()
  const list = otherPockets.value
  if (!q) return list
  return list.filter((p) => p.name.toLowerCase().includes(q))
})

const selectedTarget = computed(() => otherPockets.value.find((p) => p.id === targetPocketId.value))

const goals = computed(() => goalStore.goalsWithBalances)

const filteredGoals = computed(() => {
  const q = searchGoalQuery.value.trim().toLowerCase()
  const list = goals.value
  if (!q) return list
  return list.filter((g) => g.name.toLowerCase().includes(q))
})

const selectedGoal = computed(() => goals.value.find((g) => g.id === targetGoalId.value))

const canProceedStep1 = computed(() => {
  if (destinationTab.value === 'pocket') {
    return !!targetPocketId.value
  }
  return !!targetGoalId.value
})

const amountExceedsBalance = computed(() => amount.value > props.availableBalance)
const canProceedStep2 = computed(() => amount.value > 0 && !amountExceedsBalance.value)

function reset() {
  step.value = 1
  targetPocketId.value = ''
  targetGoalId.value = ''
  destinationTab.value = 'pocket'
  amount.value = 0
  searchPocketQuery.value = ''
  searchGoalQuery.value = ''
}

function handleClose() {
  reset()
  emit('close')
}

function next() {
  if (step.value === 1 && canProceedStep1.value) {
    step.value = 2
    return
  }
  if (step.value === 2 && canProceedStep2.value) {
    confirmMove()
  }
}

async function confirmMove() {
  if (amount.value <= 0 || amountExceedsBalance.value) return

  try {
    if (destinationTab.value === 'pocket') {
      if (!targetPocketId.value) return
      await txStore.createTransfer(props.pocketId, targetPocketId.value, amount.value)
      toast.success(t('pocket.moveMoneySuccess'))
    } else {
      if (!targetGoalId.value) return
      await txStore.createTransferToGoal(props.pocketId, targetGoalId.value, amount.value)
      toast.success(t('goal.allocationSuccess'))
    }
    reset()
    emit('success')
    emit('close')
  } catch (e) {
    toast.error(e instanceof Error ? e.message : t('common.error'))
  }
}

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      goalStore.fetchGoals()
    } else {
      reset()
    }
  },
)
</script>

<template>
  <BottomSheet :is-open="isOpen" :title="t('pocket.moveMoneyTitle')" @close="handleClose">
    <template v-if="step === 1" #headerBottom>
      <p class="text-sm text-slate-600 dark:text-slate-400">
        {{ t('pocket.moveMoneyStep1') }}
      </p>
      <!-- Tabs for Pocket/Goals -->
      <div class="mt-3 flex gap-2 border-b border-slate-200 dark:border-slate-700">
        <button type="button" :class="[
          'flex-1 py-2 text-sm font-medium transition-colors',
          destinationTab === 'pocket'
            ? 'border-b-2 border-brand text-brand'
            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300',
        ]" @click="destinationTab = 'pocket'; targetPocketId = ''; targetGoalId = ''">
          💼 {{ t('goal.tabPocket') }}
        </button>
        <button type="button" :class="[
          'flex-1 py-2 text-sm font-medium transition-colors',
          destinationTab === 'goal'
            ? 'border-b-2 border-brand text-brand'
            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300',
        ]" @click="destinationTab = 'goal'; targetPocketId = ''; targetGoalId = ''">
          🎯 {{ t('goal.tabGoal') }}
        </button>
      </div>
      <!-- Search bar -->
      <div class="relative mt-3">
        <font-awesome-icon :icon="['fas', 'search']"
          class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input v-if="destinationTab === 'pocket'" v-model="searchPocketQuery" type="text"
          :placeholder="t('pocket.searchPockets')"
          class="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500" />
        <input v-else v-model="searchGoalQuery" type="text" :placeholder="t('goal.searchGoals')"
          class="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500" />
      </div>
    </template>
    <div class="space-y-4">
      <!-- Step 1: Select destination (Pocket or Goal) -->
      <div v-if="step === 1" class="space-y-2">
        <!-- Pocket list -->
        <template v-if="destinationTab === 'pocket'">
          <button v-for="p in filteredOtherPockets" :key="p.id" type="button" :class="[
            'flex w-full items-center gap-4 rounded-xl border px-4 py-3 text-left transition',
            targetPocketId === p.id
              ? 'border-brand bg-brand/5 dark:border-brand dark:bg-brand/10'
              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600 dark:hover:bg-slate-800/80',
          ]" @click="targetPocketId = p.id">
            <div
              class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-2xl dark:bg-slate-700">
              {{ p.icon }}
            </div>
            <div class="min-w-0 flex-1 text-left">
              <p class="font-semibold text-slate-900 dark:text-slate-100">{{ p.name }}</p>
              <p class="text-sm text-slate-500 dark:text-slate-400">{{ formatIDR(p.balance) }}</p>
            </div>
            <span class="shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400">
              {{ t(`pocket.type${p.type === 'main' ? 'Main' : p.type.charAt(0).toUpperCase() + p.type.slice(1)}`) }}
            </span>
            <span v-if="targetPocketId === p.id" class="shrink-0 text-brand">
              <font-awesome-icon :icon="['fas', 'check']" class="h-5 w-5" />
            </span>
          </button>
          <p v-if="filteredOtherPockets.length === 0"
            class="py-4 text-center text-sm text-slate-500 dark:text-slate-400">
            {{ searchPocketQuery.trim() ? t('pocket.noSearchResults') : t('pocket.noOtherPockets') }}
          </p>
        </template>
        <!-- Goal list -->
        <template v-else>
          <button v-for="g in filteredGoals" :key="g.id" type="button" :class="[
            'flex w-full items-center gap-4 rounded-xl border px-4 py-3 text-left transition',
            targetGoalId === g.id
              ? 'border-brand bg-brand/5 dark:border-brand dark:bg-brand/10'
              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600 dark:hover:bg-slate-800/80',
          ]" @click="targetGoalId = g.id">
            <div
              class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-2xl dark:bg-slate-700">
              {{ g.icon }}
            </div>
            <div class="min-w-0 flex-1 text-left">
              <p class="font-semibold text-slate-900 dark:text-slate-100">{{ g.name }}</p>
              <p class="text-sm text-slate-500 dark:text-slate-400">
                {{ formatIDR(g.currentBalance) }} / {{ formatIDR(g.targetAmount) }}
              </p>
              <div class="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div class="h-full bg-brand transition-all"
                  :style="{ width: `${Math.min(100, (g.currentBalance / g.targetAmount) * 100)}%` }" />
              </div>
            </div>
            <span v-if="targetGoalId === g.id" class="shrink-0 text-brand">
              <font-awesome-icon :icon="['fas', 'check']" class="h-5 w-5" />
            </span>
          </button>
          <p v-if="filteredGoals.length === 0" class="py-4 text-center text-sm text-slate-500 dark:text-slate-400">
            {{ searchGoalQuery.trim() ? t('goal.noSearchResults') : t('goal.noGoalsYetDesc') }}
          </p>
        </template>
      </div>

      <!-- Step 2 -->
      <div v-else class="space-y-4">
        <p class="text-sm text-slate-600 dark:text-slate-400">
          {{ t('pocket.moveMoneyStep2') }}
        </p>
        <div class="rounded-lg bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
          <p class="text-xs font-medium text-slate-500 dark:text-slate-400">{{ t('pocket.moveMoneyFrom') }}</p>
          <p class="font-semibold text-slate-900 dark:text-slate-100">{{ pocketName }}</p>
          <p class="text-sm text-slate-600 dark:text-slate-400">
            {{ t('pocket.balance') }}: {{ formatIDR(availableBalance) }}
          </p>
        </div>
        <!-- Target Pocket -->
        <div v-if="selectedTarget && destinationTab === 'pocket'"
          class="rounded-lg bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
          <p class="text-xs font-medium text-slate-500 dark:text-slate-400">{{ t('pocket.moveMoneyTo') }}</p>
          <p class="font-semibold text-slate-900 dark:text-slate-100">{{ selectedTarget.name }}</p>
        </div>
        <!-- Target Goal -->
        <div v-else-if="selectedGoal && destinationTab === 'goal'"
          class="rounded-lg bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
          <p class="text-xs font-medium text-slate-500 dark:text-slate-400">{{ t('goal.allocationTo') }}</p>
          <p class="font-semibold text-slate-900 dark:text-slate-100">{{ selectedGoal.name }}</p>
          <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {{ formatIDR(selectedGoal.currentBalance) }} / {{ formatIDR(selectedGoal.targetAmount) }}
          </p>
          <div class="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div class="h-full bg-brand transition-all"
              :style="{ width: `${Math.min(100, (selectedGoal.currentBalance / selectedGoal.targetAmount) * 100)}%` }" />
          </div>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {{ t('goal.progress') }}: {{ Math.min(100, Math.round((selectedGoal.currentBalance /
              selectedGoal.targetAmount)
            * 100)) }}%
          </p>
        </div>
        <CurrencyInput v-model="amount" :label="t('transaction.amount')" />
        <p v-if="amountExceedsBalance && amount > 0" class="text-sm text-amber-600 dark:text-amber-400">
          {{ t('pocket.moveMoneyExceedsBalance') }}
        </p>
        <p v-if="destinationTab === 'goal'" class="text-sm text-slate-600 dark:text-slate-400">
          {{ t('goal.allocationHelper') }}
        </p>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <BaseButton v-if="step === 1" variant="secondary" @click="handleClose">
          {{ t('common.cancel') }}
        </BaseButton>
        <BaseButton v-if="step === 2" variant="secondary" @click="step = 1">
          {{ t('pocket.moveMoneyBack') }}
        </BaseButton>
        <BaseButton :disabled="(step === 1 && !canProceedStep1) || (step === 2 && !canProceedStep2)" @click="next">
          {{ step === 1 ? t('pocket.moveMoneyNext') : t('pocket.moveMoneyConfirm') }}
        </BaseButton>
      </div>
    </template>
  </BottomSheet>
</template>
