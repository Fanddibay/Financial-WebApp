<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Goal } from '@/types/goal'
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
  goal: Goal | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  saved: [data: { name: string; icon: string; targetAmount: number; durationMonths: number; color: string }]
}>()

const name = ref('')
const icon = ref('🎯')
const targetAmount = ref(0)
const durationMonths = ref(12)
const color = ref(DEFAULT_POCKET_COLOR)
const error = ref('')

watch(
  () => [props.isOpen, props.goal] as const,
  ([open, g]) => {
    if (open && g) {
      name.value = g.name
      icon.value = g.icon || '🎯'
      targetAmount.value = g.targetAmount
      durationMonths.value = g.durationMonths
      color.value = g.color || DEFAULT_POCKET_COLOR
      error.value = ''
    }
  },
  { immediate: true },
)

const previewStyle = computed(() => ({
  backgroundColor: color.value,
  borderColor: color.value,
}))

const darkPreview = computed(() => isDarkColor(color.value))

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
  error.value = ''
  emit('saved', {
    name: trimmed,
    icon: icon.value,
    targetAmount: targetAmount.value,
    durationMonths: durationMonths.value,
    color: color.value,
  })
  emit('close')
}

function handleClose() {
  error.value = ''
  emit('close')
}
</script>

<template>
  <BottomSheet :is-open="isOpen" :title="t('goal.editTitle')" max-height="85" @close="handleClose">
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
      <CurrencyInput v-model="targetAmount" :label="t('goal.targetAmount')" />
      <BaseInput
        v-model.number="durationMonths"
        type="number"
        :label="t('goal.durationMonths')"
        :min="1"
      />
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
