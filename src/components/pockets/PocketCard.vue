<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { Pocket } from '@/types/pocket'
import { formatIDR } from '@/utils/currency'
import { isDarkColor } from '@/utils/pocketColors'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

interface Props {
  pocket: Pocket
  balance: number
  hideBalance?: boolean
  /** When true, pocket is read-only (Basic >2); shows lock, reduced opacity, tap opens disabled modal. */
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), { hideBalance: false, disabled: false })
const emit = defineEmits<{ 'disabled-click': [] }>()
const router = useRouter()

const darkBg = computed(() => props.pocket.color && isDarkColor(props.pocket.color))

const baseClasses = computed(() => {
  const color = props.pocket.color
  const classes = 'flex flex-col items-start gap-4 rounded-xl border-2 p-4 transition '
  if (props.disabled) {
    return classes + 'cursor-not-allowed opacity-60 border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/30'
  }
  return classes + (color ? 'hover:shadow-md hover:border-black/20' : 'border-slate-200 bg-white hover:border-brand/40 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-brand/40')
})

const cardStyle = computed(() => {
  if (props.disabled || !props.pocket.color) return undefined
  return { backgroundColor: props.pocket.color, borderColor: props.pocket.color }
})

function handleClick() {
  if (props.disabled) {
    emit('disabled-click')
    return
  }
  router.push(`/pockets/${props.pocket.id}`)
}
</script>

<template>
  <button
    type="button"
    class="w-full text-left"
    :class="baseClasses"
    :style="cardStyle"
    :aria-disabled="disabled"
    @click="handleClick"
  >
    <div class="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl"
      :class="pocket.color && !disabled ? (darkBg ? 'bg-white/20' : 'bg-white/80 shadow-sm') : 'bg-slate-100 dark:bg-slate-700'">
      {{ pocket.icon }}
      <span
        v-if="disabled"
        class="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-600 text-white dark:bg-slate-500"
      >
        <font-awesome-icon :icon="['fas', 'lock']" class="h-2.5 w-2.5" />
      </span>
    </div>
    <div class="min-w-0 flex-1">
      <p :class="['truncate font-semibold', darkBg && !disabled ? 'text-white' : 'text-slate-900 dark:text-slate-100']">
        {{ pocket.name }}
      </p>
      <p :class="['text-sm font-medium', darkBg && !disabled ? 'text-white/80' : 'text-slate-600 dark:text-slate-400']">
        {{ hideBalance ? '••••••••' : formatIDR(balance) }}
      </p>
    </div>
  </button>
</template>
