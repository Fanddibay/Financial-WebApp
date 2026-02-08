<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { Goal } from '@/types/goal'
import { formatIDR } from '@/utils/currency'
import { isDarkColor } from '@/utils/pocketColors'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useI18n } from 'vue-i18n'

interface Props {
  goal: Goal
  currentBalance: number
  hideBalance?: boolean
  /** When true, goal is locked (Basic >1); shows lock, reduced opacity, tap opens disabled modal. */
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), { hideBalance: false, disabled: false })
const emit = defineEmits<{ 'disabled-click': [] }>()
const router = useRouter()
const { t } = useI18n()

const darkBg = computed(() => props.goal.color && isDarkColor(props.goal.color))
const hasCustomColor = computed(() => !!props.goal.color && !props.disabled)

const progressPercent = computed(() => {
  if (props.goal.targetAmount === 0) return 0
  return Math.min(100, Math.round((props.currentBalance / props.goal.targetAmount) * 100))
})

const baseClasses = computed(() => {
  const color = props.goal.color
  const classes = 'flex flex-col items-stretch gap-3 rounded-xl border-2 p-4 transition '
  if (props.disabled) {
    return classes + 'cursor-not-allowed opacity-60 border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/30'
  }
  return classes + (color ? 'hover:shadow-md hover:border-black/20' : 'border-slate-200 bg-white hover:border-brand/40 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-brand/40')
})

const cardStyle = computed(() => {
  if (props.disabled || !props.goal.color) return undefined
  return { backgroundColor: props.goal.color, borderColor: props.goal.color }
})

function handleClick() {
  if (props.disabled) {
    emit('disabled-click')
    return
  }
  router.push(`/goals/${props.goal.id}`)
}
</script>

<template>
  <button type="button" class="w-full text-left" :class="baseClasses" :style="cardStyle" :aria-disabled="disabled"
    @click="handleClick">
    <!-- Top row: icon (left), progress (right) -->
    <div class="flex items-start justify-between gap-2">
      <div class="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl"
        :class="goal.color && !disabled ? (darkBg ? 'bg-white/20' : 'bg-white/80 shadow-sm') : 'bg-slate-100 dark:bg-slate-700'">
        {{ goal.icon }}
        <span
          v-if="disabled"
          class="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-600 text-white dark:bg-slate-500"
        >
          <font-awesome-icon :icon="['fas', 'lock']" class="h-2.5 w-2.5" />
        </span>
      </div>
      <span class="shrink-0 text-xs font-medium"
        :class="hasCustomColor ? (darkBg ? 'text-white/90' : 'text-slate-800') : 'text-slate-600 dark:text-slate-400'">
        {{ progressPercent }}%
      </span>
    </div>
    <!-- Goal name + balance -->
    <div class="min-w-0 space-y-0.5">
      <p class="truncate text-base font-bold"
        :class="hasCustomColor ? (darkBg ? 'text-white' : 'text-slate-900') : 'text-slate-900 dark:text-slate-100'">
        {{ goal.name }}
      </p>
      <p class="text-sm"
        :class="hasCustomColor ? (darkBg ? 'text-white/90' : 'text-slate-700') : 'text-slate-600 dark:text-slate-400'">
        {{ hideBalance ? '••••••••' : `${formatIDR(currentBalance)} / ${formatIDR(goal.targetAmount)}` }}
      </p>
    </div>
    <!-- Progress bar -->
    <div class="h-1.5 w-full overflow-hidden rounded-full"
      :class="hasCustomColor ? (darkBg ? 'bg-white/30' : 'bg-black/10') : 'bg-slate-200 dark:bg-slate-700'">
      <div class="h-full transition-all" :class="hasCustomColor ? (darkBg ? 'bg-white' : 'bg-slate-900') : 'bg-brand'"
        :style="{ width: `${progressPercent}%` }" />
    </div>
  </button>
</template>
