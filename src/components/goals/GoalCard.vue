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
}

const props = withDefaults(defineProps<Props>(), { hideBalance: false })
const router = useRouter()
const { t } = useI18n()

const darkBg = computed(() => props.goal.color && isDarkColor(props.goal.color))
const hasCustomColor = computed(() => !!props.goal.color)

const progressPercent = computed(() => {
  if (props.goal.targetAmount === 0) return 0
  return Math.min(100, Math.round((props.currentBalance / props.goal.targetAmount) * 100))
})

const baseClasses = computed(() => {
  const color = props.goal.color
  const classes = 'flex flex-col items-stretch gap-3 rounded-xl border-2 p-4 transition '
  return classes + (color ? 'hover:shadow-md hover:border-black/20' : 'border-slate-200 bg-white hover:border-brand/40 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-brand/40')
})

const cardStyle = computed(() => {
  if (!props.goal.color) return undefined
  return { backgroundColor: props.goal.color, borderColor: props.goal.color }
})

function handleClick() {
  router.push(`/goals/${props.goal.id}`)
}
</script>

<template>
  <button type="button" class="w-full text-left" :class="baseClasses" :style="cardStyle" @click="handleClick">
    <!-- Top row: icon (left), progress (right) -->
    <div class="flex items-start justify-between gap-2">
      <div class="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl"
        :class="goal.color ? (darkBg ? 'bg-white/20' : 'bg-white/80 shadow-sm') : 'bg-slate-100 dark:bg-slate-700'">
        {{ goal.icon }}
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
