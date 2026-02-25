<script setup lang="ts">
import { ref, watch } from 'vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import CurrencyInput from '@/components/ui/CurrencyInput.vue'
import type { RecurringFrequency } from '@/types/recurring'
import { useRecurringStore } from '@/stores/recurring'
import { usePocketStore } from '@/stores/pocket'
import { usePocketLimits } from '@/composables/usePocketLimits'
import { useTokenStore } from '@/stores/token'
import { MAIN_POCKET_ID } from '@/services/pocketService'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

interface Props {
  isOpen: boolean
  editingId?: string | null
}

const props = defineProps<Props>()
const emit = defineEmits<{ close: []; saved: [] }>()

const recurringStore = useRecurringStore()
const pocketStore = usePocketStore()
const { getActivePockets } = usePocketLimits()
const tokenStore = useTokenStore()

const name = ref('')
const amount = ref(0)
const type = ref<'income' | 'expense'>('expense')
const pocketId = ref(MAIN_POCKET_ID)
const frequency = ref<RecurringFrequency>('monthly')
const customIntervalDays = ref(7)
const startDate = ref(new Date().toISOString().split('T')[0]!)

const activePockets = ref(
  getActivePockets(pocketStore.pockets, tokenStore.isLicenseActive),
)
function effectivePocketId(): string {
  return activePockets.value.find((p) => p.id === pocketId.value)?.id ?? activePockets.value[0]?.id ?? MAIN_POCKET_ID
}

const canSave = () => amount.value > 0 && pocketId.value && name.value.trim().length > 0

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      pocketStore.fetchPockets()
      activePockets.value = getActivePockets(pocketStore.pockets, tokenStore.isLicenseActive)
      if (props.editingId) {
        const item = recurringStore.getById(props.editingId)
        if (item) {
          name.value = item.name
          amount.value = item.amount
          type.value = item.type
          pocketId.value = item.pocket_id
          frequency.value = item.frequency
          customIntervalDays.value = item.custom_interval_days ?? 7
          startDate.value = item.start_date
        }
      } else {
        name.value = ''
        amount.value = 0
        type.value = 'expense'
        pocketId.value = activePockets.value[0]?.id ?? MAIN_POCKET_ID
        frequency.value = 'monthly'
        customIntervalDays.value = 7
        startDate.value = new Date().toISOString().split('T')[0]!
      }
    }
  },
)

function save() {
  if (!canSave()) return
  try {
    if (props.editingId) {
      recurringStore.updateRecurring(props.editingId, {
        name: name.value.trim(),
        amount: amount.value,
        type: type.value,
        pocket_id: effectivePocketId(),
        frequency: frequency.value,
        custom_interval_days: frequency.value === 'custom' ? customIntervalDays.value : null,
        start_date: startDate.value,
      })
    } else {
      recurringStore.createRecurring({
        name: name.value.trim(),
        amount: amount.value,
        type: type.value,
        pocket_id: effectivePocketId(),
        frequency: frequency.value,
        custom_interval_days: frequency.value === 'custom' ? customIntervalDays.value : null,
        start_date: startDate.value,
      })
    }
    emit('saved')
    emit('close')
  } catch {
    // error from store
  }
}
</script>

<template>
  <BottomSheet
    :is-open="isOpen"
    :title="editingId ? t('recurring.editTitle') : t('recurring.createTitle')"
    max-height="90"
    @close="emit('close')"
  >
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">{{ t('recurring.name') }}</label>
        <input
          v-model="name"
          type="text"
          :placeholder="t('recurring.namePlaceholder')"
          class="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
      </div>
      <CurrencyInput v-model="amount" :label="t('recurring.amount')" />
      <div>
        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">{{ t('recurring.type') }}</label>
        <div class="mt-2 flex gap-2">
          <button
            type="button"
            :class="[
              'flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition',
              type === 'expense'
                ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-300'
                : 'border-slate-200 bg-white text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400',
            ]"
            @click="type = 'expense'"
          >
            {{ t('recurring.typeExpense') }}
          </button>
          <button
            type="button"
            :class="[
              'flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition',
              type === 'income'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                : 'border-slate-200 bg-white text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400',
            ]"
            @click="type = 'income'"
          >
            {{ t('recurring.typeIncome') }}
          </button>
        </div>
      </div>
      <div v-if="activePockets.length > 1">
        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">{{ t('recurring.pocket') }}</label>
        <select
          v-model="pocketId"
          class="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        >
          <option v-for="p in activePockets" :key="p.id" :value="p.id">{{ p.icon }} {{ p.name }}</option>
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">{{ t('recurring.frequency') }}</label>
        <div class="mt-2 grid grid-cols-2 gap-2">
          <button
            v-for="f in ['daily', 'weekly', 'monthly', 'custom']"
            :key="f"
            type="button"
            :class="[
              'rounded-xl border px-3 py-2.5 text-sm font-medium transition',
              frequency === f
                ? 'border-brand bg-brand/10 text-brand dark:border-brand dark:bg-brand/20 dark:text-brand-light'
                : 'border-slate-200 bg-white text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400',
            ]"
            @click="frequency = f as RecurringFrequency"
          >
            {{ t(`recurring.frequency${(f as string).charAt(0).toUpperCase() + (f as string).slice(1)}` as const) }}
          </button>
        </div>
        <div v-if="frequency === 'custom'" class="mt-2">
          <input
            v-model.number="customIntervalDays"
            type="number"
            min="1"
            max="365"
            class="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            :placeholder="t('recurring.customIntervalLabel')"
          />
        </div>
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">{{ t('recurring.startDate') }}</label>
        <input
          v-model="startDate"
          type="date"
          class="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
      </div>
    </div>
    <template #footer>
      <BaseButton variant="primary" class="w-full" :disabled="!canSave()" @click="save">
        {{ t('recurring.save') }}
      </BaseButton>
    </template>
  </BottomSheet>
</template>
