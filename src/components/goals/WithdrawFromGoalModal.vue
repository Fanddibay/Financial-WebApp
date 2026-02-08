<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import CurrencyInput from '@/components/ui/CurrencyInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import { usePocketStore } from '@/stores/pocket'
import { useTransactionStore } from '@/stores/transaction'
import { useToastStore } from '@/stores/toast'
import { useTokenStore } from '@/stores/token'
import { usePocketLimits } from '@/composables/usePocketLimits'
import { MAIN_POCKET_ID } from '@/services/pocketService'
import { formatIDR } from '@/utils/currency'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

interface Props {
  isOpen: boolean
  goalId: string
  goalName: string
  currentBalance: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  success: []
}>()

const pocketStore = usePocketStore()
const txStore = useTransactionStore()
const toast = useToastStore()
const tokenStore = useTokenStore()
const { getActivePockets } = usePocketLimits()

const amount = ref(0)
const destination = ref<'pocket' | 'expense'>('pocket')
const selectedPocketId = ref('')

const activePockets = computed(() =>
  getActivePockets(pocketStore.pockets, tokenStore.isLicenseActive),
)

const pocketOptions = computed(() =>
  activePockets.value.map((p) => ({ value: p.id, label: `${p.icon} ${p.name}` })),
)

const amountExceedsBalance = computed(() => amount.value > props.currentBalance)
const canProceed = computed(() => {
  if (amount.value <= 0 || amountExceedsBalance.value) return false
  if (destination.value === 'pocket' && !selectedPocketId.value) return false
  return true
})

function reset() {
  amount.value = 0
  destination.value = 'pocket'
  selectedPocketId.value = ''
}

function handleClose() {
  reset()
  emit('close')
}

async function confirmWithdrawal() {
  if (!canProceed.value) return

  try {
    const targetPocketId = destination.value === 'pocket'
      ? selectedPocketId.value
      : MAIN_POCKET_ID // For "expense", use main pocket

    await txStore.createWithdrawalFromGoal(props.goalId, targetPocketId, amount.value)
    toast.success(t('goal.useFromGoalSuccess'))
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
      pocketStore.fetchPockets()
      if (activePockets.value.length > 0) {
        selectedPocketId.value = activePockets.value[0]?.id ?? MAIN_POCKET_ID
      }
    } else {
      reset()
    }
  },
)
</script>

<template>
  <BottomSheet :is-open="isOpen" :title="t('goal.useFromGoalTitle')" @close="handleClose">
    <template #headerBottom>
      <p class="text-sm text-slate-600 dark:text-slate-400">
        {{ t('goal.useFromGoalDesc') }}
      </p>
    </template>
    <div class="space-y-4">
      <div class="rounded-lg bg-amber-50 px-4 py-3 dark:bg-amber-900/20">
        <p class="text-sm text-amber-900 dark:text-amber-200">
          {{ t('goal.useFromGoalWarning') }}
        </p>
      </div>
      <div class="rounded-lg bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
        <p class="text-xs font-medium text-slate-500 dark:text-slate-400">{{ t('goal.currentBalance') }}</p>
        <p class="font-semibold text-slate-900 dark:text-slate-100">{{ goalName }}</p>
        <p class="text-sm text-slate-600 dark:text-slate-400">
          {{ formatIDR(currentBalance) }}
        </p>
      </div>
      <CurrencyInput v-model="amount" :label="t('goal.useFromGoalAmount')" />
      <p v-if="amountExceedsBalance && amount > 0" class="text-sm text-amber-600 dark:text-amber-400">
        {{ t('goal.useFromGoalExceedsBalance') }}
      </p>
      <div>
        <label class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
          {{ t('goal.useFromGoalDestination') }}
        </label>
        <div class="space-y-2">
          <button type="button" :class="[
            'w-full rounded-xl border px-4 py-3 text-left transition',
            destination === 'pocket'
              ? 'border-brand bg-brand/5 dark:border-brand dark:bg-brand/10'
              : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800',
          ]" @click="destination = 'pocket'">
            <p class="font-semibold text-slate-900 dark:text-slate-100">
              {{ t('goal.useFromGoalDestinationPocket') }}
            </p>
            <p class="text-sm text-slate-500 dark:text-slate-400">
              {{ t('goal.useFromGoalDestinationPocketDesc') }}
            </p>
          </button>
          <button type="button" :class="[
            'w-full rounded-xl border px-4 py-3 text-left transition',
            destination === 'expense'
              ? 'border-brand bg-brand/5 dark:border-brand dark:bg-brand/10'
              : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800',
          ]" @click="destination = 'expense'">
            <p class="font-semibold text-slate-900 dark:text-slate-100">
              {{ t('goal.useFromGoalDestinationExpense') }}
            </p>
            <p class="text-sm text-slate-500 dark:text-slate-400">
              {{ t('goal.useFromGoalDestinationExpenseDesc') }}
            </p>
          </button>
        </div>
      </div>
      <div v-if="destination === 'pocket'">
        <BaseSelect v-model="selectedPocketId" :options="pocketOptions" :label="t('pocket.selectPocket')" />
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <BaseButton variant="secondary" @click="handleClose">
          {{ t('common.cancel') }}
        </BaseButton>
        <BaseButton :disabled="!canProceed" @click="confirmWithdrawal">
          {{ t('goal.useFromGoalConfirm') }}
        </BaseButton>
      </div>
    </template>
  </BottomSheet>
</template>
