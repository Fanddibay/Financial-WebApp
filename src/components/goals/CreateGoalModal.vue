<script setup lang="ts">
import { ref, computed } from 'vue'
import type { GoalType } from '@/types/goal'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import CurrencyInput from '@/components/ui/CurrencyInput.vue'
import IconPicker from '@/components/pockets/IconPicker.vue'
import PocketColorPicker from '@/components/pockets/PocketColorPicker.vue'
import { DEFAULT_POCKET_COLOR, isDarkColor } from '@/utils/pocketColors'
import { formatIDR } from '@/utils/currency'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

interface Props {
  isOpen: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  close: []
  created: [data: {
    name: string
    icon: string
    targetAmount: number
    durationMonths: number
    color?: string
    type?: GoalType
    annualReturnPercentage?: number
  }]
}>()

const name = ref('')
const icon = ref('🎯')
const goalType = ref<GoalType>('saving')
const targetAmount = ref(0)
const durationMonths = ref(12)
const annualReturnPercentage = ref<number>(0)
const color = ref(DEFAULT_POCKET_COLOR)
const error = ref('')

const previewStyle = computed(() => ({
  backgroundColor: color.value,
  borderColor: color.value,
}))

const darkPreview = computed(() => isDarkColor(color.value))

function reset() {
  name.value = ''
  icon.value = '🎯'
  goalType.value = 'saving'
  targetAmount.value = 0
  durationMonths.value = 12
  annualReturnPercentage.value = 0
  color.value = DEFAULT_POCKET_COLOR
  error.value = ''
}

function handleClose() {
  reset()
  emit('close')
}

function submit() {
  const trimmed = name.value.trim()
  if (!trimmed) {
    error.value = t('goal.goalNameRequired')
    return
  }
  if (targetAmount.value <= 0) {
    error.value = t('goal.targetAmountRequired')
    return
  }
  if (durationMonths.value <= 0) {
    error.value = t('goal.durationMonthsRequired')
    return
  }
  if (goalType.value === 'investment' && (annualReturnPercentage.value < 0 || annualReturnPercentage.value > 100)) {
    error.value = t('goal.annualReturnLabel') + ' 0–100'
    return
  }
  error.value = ''
  emit('created', {
    name: trimmed,
    icon: icon.value,
    targetAmount: targetAmount.value,
    durationMonths: durationMonths.value,
    color: color.value,
    type: goalType.value,
    annualReturnPercentage: goalType.value === 'investment' ? (annualReturnPercentage.value || 0) : undefined,
  })
  reset()
  emit('close')
}
</script>

<template>
  <BottomSheet :is-open="isOpen" :title="t('goal.createTitle')" :subtitle="t('goal.createDesc')" max-height="85" @close="handleClose">
    <div class="space-y-4">
      <BaseInput
        v-model="name"
        :label="t('goal.goalName')"
        :placeholder="t('goal.goalNamePlaceholder')"
        :error="error"
      />
      <div>
        <label class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
          {{ t('goal.icon') }}
        </label>
        <IconPicker v-model="icon" />
      </div>

      <div>
        <label class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
          {{ t('goal.goalType') }}
        </label>
        <div class="flex gap-2">
          <button
            type="button"
            :class="[
              'flex-1 rounded-xl border-2 py-2.5 text-sm font-medium transition',
              goalType === 'saving'
                ? 'border-brand bg-brand/10 text-brand dark:bg-brand/20'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400',
            ]"
            @click="goalType = 'saving'"
          >
            {{ t('goal.goalTypeSaving') }}
          </button>
          <button
            type="button"
            :class="[
              'flex-1 rounded-xl border-2 py-2.5 text-sm font-medium transition',
              goalType === 'investment'
                ? 'border-brand bg-brand/10 text-brand dark:bg-brand/20'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400',
            ]"
            @click="goalType = 'investment'"
          >
            {{ t('goal.goalTypeInvestment') }}
          </button>
        </div>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {{ goalType === 'saving' ? t('goal.goalTypeSavingDesc') : t('goal.goalTypeInvestmentDesc') }}
        </p>
      </div>

      <CurrencyInput v-model="targetAmount" :label="t('goal.targetAmount')" :error="error" />
      <BaseInput
        v-model.number="durationMonths"
        type="number"
        :label="t('goal.durationMonths')"
        :min="1"
        :error="error"
      />

      <template v-if="goalType === 'investment'">
        <BaseInput
          v-model.number="annualReturnPercentage"
          type="number"
          :label="t('goal.annualReturnLabel')"
          :placeholder="t('goal.annualReturnPlaceholder')"
          :min="0"
          :max="100"
          step="0.5"
        />
        <p class="text-xs text-slate-500 dark:text-slate-400">
          {{ t('goal.returnCalculatedDaily') }}
        </p>
        <div class="rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
          {{ t('goal.investmentDisclaimer') }}
        </div>
      </template>

      <PocketColorPicker v-model="color" />
      <div>
        <p class="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          {{ t('pocket.preview') }}
        </p>
        <div
          class="flex items-center gap-3 rounded-xl border-2 p-3"
          :style="previewStyle"
        >
          <div
            class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl shadow-sm"
            :class="darkPreview ? 'bg-white/20' : 'bg-white/80'"
          >
            {{ icon }}
          </div>
          <div class="min-w-0 flex-1">
            <p
              class="truncate text-base font-bold"
              :class="darkPreview ? 'text-white' : 'text-slate-900'"
            >
              {{ name || t('goal.goalNamePlaceholder') }}
            </p>
            <p
              class="text-sm"
              :class="darkPreview ? 'text-white/90' : 'text-slate-600'"
            >
              {{ targetAmount > 0 ? formatIDR(targetAmount) : t('goal.targetAmount') }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <BaseButton variant="secondary" @click="handleClose">
          {{ t('common.cancel') }}
        </BaseButton>
        <BaseButton @click="submit">
          {{ t('common.save') }}
        </BaseButton>
      </div>
    </template>
  </BottomSheet>
</template>
