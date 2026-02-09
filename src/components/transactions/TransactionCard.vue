<script setup lang="ts">
import { computed, inject, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { Transaction } from '@/types/transaction'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { formatIDR } from '@/utils/currency'
import { getCategoryIcon } from '@/utils/categoryIcons'
import { usePocketStore } from '@/stores/pocket'
import { useGoalStore } from '@/stores/goal'
import { useI18n } from 'vue-i18n'
import {
  DESC_PREFIX_TRANSFER_FROM_DELETED,
  DESC_PREFIX_TRANSFER_REVERTED_DELETED,
} from '@/services/transactionService'

interface Props {
  transaction: Transaction
  /** When listing per-pocket, pass current pocket id to show transfer direction (from/to). */
  contextPocketId?: string
  /** When true (e.g. on pocket/goal detail), clicking a transfer card does not navigate to the other pocket/goal. */
  disableTransferNavigation?: boolean
  hideActions?: boolean
  /** List style: no card border/background, full-width row with bottom border only */
  flat?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  edit: [id: string]
  delete: [id: string]
}>()

const { t } = useI18n()
const router = useRouter()
const pocketStore = usePocketStore()
const goalStore = useGoalStore()

const openMenuId = inject<{ value: string | null }>('transactionMenuOpenId', { value: null })
const setOpenMenuId = inject<(id: string | null) => void>('transactionMenuSetOpenId', () => { })

const rootRef = ref<HTMLElement | null>(null)
let clickOutsideHandler: ((e: MouseEvent) => void) | null = null

const isMenuOpen = computed(() => openMenuId.value === props.transaction.id)

function toggleMenu(e: MouseEvent) {
  e.stopPropagation()
  const next = openMenuId.value === props.transaction.id ? null : props.transaction.id
  setOpenMenuId(next)
}

function closeIfOutside(e: MouseEvent) {
  const target = e.target as Node
  if (rootRef.value && !rootRef.value.contains(target)) {
    setOpenMenuId(null)
    if (clickOutsideHandler) {
      document.removeEventListener('click', clickOutsideHandler)
      clickOutsideHandler = null
    }
  }
}

watch(isMenuOpen, (open) => {
  if (open) {
    nextTick(() => {
      clickOutsideHandler = closeIfOutside
      setTimeout(() => document.addEventListener('click', clickOutsideHandler!), 0)
    })
  } else if (clickOutsideHandler) {
    document.removeEventListener('click', clickOutsideHandler)
    clickOutsideHandler = null
  }
})

onBeforeUnmount(() => {
  if (clickOutsideHandler) {
    document.removeEventListener('click', clickOutsideHandler)
  }
})

const isTransfer = computed(() => props.transaction.type === 'transfer')

const formattedAmount = computed(() => formatIDR(props.transaction.amount))

const formattedDate = computed(() =>
  new Date(props.transaction.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }),
)

const categoryIcon = computed(() => {
  if (isTransfer.value) return '↔️'
  return getCategoryIcon(props.transaction.category, props.transaction.type as 'income' | 'expense')
})

const displayTitle = computed(() => {
  const desc = props.transaction.description
  if (desc.startsWith(DESC_PREFIX_TRANSFER_FROM_DELETED) || desc.startsWith(DESC_PREFIX_TRANSFER_REVERTED_DELETED)) {
    return ''
  }
  if (!isTransfer.value) return desc
  const pid = props.contextPocketId
  const fromId = props.transaction.pocketId
  const toId = props.transaction.transferToPocketId
  const fromName = toId ? pocketStore.getPocketById(fromId)?.name ?? fromId : ''
  const toName = toId ? pocketStore.getPocketById(toId)?.name ?? toId : ''
  if (pid === toId) return `From ${fromName}`
  return `To ${toName}`
})

const isFromDeletedPocket = computed(() =>
  props.transaction.description.startsWith(DESC_PREFIX_TRANSFER_FROM_DELETED),
)
const isRevertedDeletedPocket = computed(() =>
  props.transaction.description.startsWith(DESC_PREFIX_TRANSFER_REVERTED_DELETED),
)

const displayTitleMain = computed(() => {
  const desc = props.transaction.description
  if (desc.startsWith(DESC_PREFIX_TRANSFER_FROM_DELETED)) {
    const name = desc.slice(DESC_PREFIX_TRANSFER_FROM_DELETED.length) || 'Pocket'
    return t('transaction.fromPocketDeleted', { name })
  }
  if (desc.startsWith(DESC_PREFIX_TRANSFER_REVERTED_DELETED)) {
    const name = desc.slice(DESC_PREFIX_TRANSFER_REVERTED_DELETED.length) || 'Pocket'
    return t('transaction.revertedDeletedPocket', { name })
  }
  return ''
})

const displayTitleLabel = computed(() => {
  if (isFromDeletedPocket.value || isRevertedDeletedPocket.value) {
    return t('transaction.deletedPocketLabel')
  }
  return ''
})

const pocketLabel = computed(() => {
  const tx = props.transaction
  if (tx.type === 'transfer') {
    if (tx.goalId && tx.transferToPocketId) {
      const goalName = goalStore.getGoalById(tx.goalId)?.name ?? ''
      const pocketName = pocketStore.getPocketById(tx.transferToPocketId)?.name ?? ''
      return goalName && pocketName ? `${goalName} → ${pocketName}` : ''
    }
    if (tx.transferToGoalId) {
      const fromName = pocketStore.getPocketById(tx.pocketId)?.name ?? ''
      const toName = goalStore.getGoalById(tx.transferToGoalId)?.name ?? ''
      return fromName && toName ? `${fromName} → ${toName}` : ''
    }
    const from = pocketStore.getPocketById(tx.pocketId)?.name ?? ''
    const to = tx.transferToPocketId ? pocketStore.getPocketById(tx.transferToPocketId)?.name ?? '' : ''
    return from && to ? `${from} → ${to}` : ''
  }
  if (tx.goalId) {
    const goal = goalStore.getGoalById(tx.goalId)
    return goal?.name ?? ''
  }
  const pocket = pocketStore.getPocketById(tx.pocketId)
  return pocket?.name ?? ''
})

const isInflow = computed(() => {
  if (!isTransfer.value) return props.transaction.type === 'income'
  return props.contextPocketId === props.transaction.transferToPocketId
})

const cardClass = computed(() => {
  if (isTransfer.value) return 'border-slate-200 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-800/30'
  return props.transaction.type === 'income'
    ? 'border-green-200 bg-green-50/40 dark:border-green-800/50 dark:bg-green-900/10'
    : 'border-red-200 bg-red-50/30 dark:border-red-900/40 dark:bg-red-900/10'
})

const iconBgClass = computed(() => {
  if (isTransfer.value) return 'bg-slate-200 dark:bg-slate-600'
  return props.transaction.type === 'income'
    ? 'bg-green-100 dark:bg-green-900/40'
    : 'bg-red-100 dark:bg-red-900/30'
})

const amountClass = computed(() => {
  if (isTransfer.value) return isInflow.value ? 'text-green-700 dark:text-green-400' : 'text-slate-700 dark:text-slate-300'
  return props.transaction.type === 'income' ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
})

const allowEdit = computed(() => !isTransfer.value)

function handleEdit() {
  setOpenMenuId(null)
  emit('edit', props.transaction.id)
}

function handleDelete() {
  setOpenMenuId(null)
  emit('delete', props.transaction.id)
}

function handleCardClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (target.closest('button') || target.closest('[role="menu"]') || isMenuOpen.value) return

  const tx = props.transaction
  if (props.disableTransferNavigation && tx.type === 'transfer') return

  if (tx.goalId && tx.type === 'income') {
    router.push(`/goals/${tx.goalId}`)
  } else if (tx.transferToGoalId) {
    router.push(`/goals/${tx.transferToGoalId}`)
  } else if (tx.goalId && tx.transferToPocketId) {
    router.push(`/goals/${tx.goalId}`)
  } else if (tx.transferToPocketId) {
    router.push(`/pockets/${tx.transferToPocketId}`)
  } else if (tx.pocketId) {
    router.push(`/pockets/${tx.pocketId}`)
  }
}
</script>

<template>
  <div ref="rootRef"
    :class="[
      'relative flex cursor-pointer items-center justify-between gap-4 transition',
      flat
        ? 'border-b border-slate-200 py-3 dark:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/50'
        : ['rounded-xl border p-3.5 hover:shadow-sm', cardClass],
    ]"
    @click="handleCardClick">
    <!-- Left: icon + details -->
    <div class="min-w-0 flex-1">
      <div class="flex items-start gap-3">
        <div :class="['flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl', iconBgClass]">
          {{ categoryIcon }}
        </div>
        <div class="min-w-0 flex-1 space-y-1">
          <h3 class="truncate text-base font-semibold leading-tight text-slate-900 dark:text-slate-100">
            <template v-if="displayTitleLabel">{{ displayTitleMain }}</template>
            <template v-else>{{ displayTitle }}</template>
          </h3>
          <span v-if="displayTitleLabel"
            class="text-xs font-normal text-slate-500 dark:text-slate-400">
            {{ displayTitleLabel }}
          </span>
          <span v-else-if="!isTransfer"
            class="inline-flex items-center gap-1 rounded-lg text-xs font-medium text-slate-600  dark:text-slate-300">
            {{ categoryIcon }} {{ transaction.category }}
          </span>
          <span v-else
            class="inline-flex items-center rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
            Transfer
          </span>
        </div>
      </div>
    </div>
    <!-- Right: amount + pocket (stacked), dots vertical di samping -->
    <div class="flex shrink-0 items-center gap-3">
      <div class="flex flex-col items-end gap-0.5">
        <span :class="['text-sm font-bold tabular-nums', amountClass]">
          {{ isInflow ? '+' : '-' }}{{ formattedAmount }}
        </span>
        <p v-if="pocketLabel" class="text-xs leading-tight text-slate-500 dark:text-slate-400">
          {{ pocketLabel }}
        </p>
      </div>
      <div class="relative flex shrink-0 items-start">
        <button v-if="!hideActions" type="button"
          class="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-200/80 hover:text-slate-700 dark:hover:bg-slate-600 dark:hover:text-slate-300"
          :aria-label="t('transaction.actions')" @click="toggleMenu">
          <font-awesome-icon :icon="['fas', 'ellipsis-vertical']" class="h-4 w-4" />
        </button>
        <Transition enter-active-class="transition duration-150 ease-out" enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100" leave-active-class="transition duration-100 ease-in"
          leave-from-class="opacity-100 scale-100" leave-to-class="opacity-0 scale-95">
          <div v-if="isMenuOpen"
            class="absolute right-0 top-full z-10 mt-1 min-w-[140px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
            <button v-if="allowEdit" type="button"
              class="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/50"
              @click="handleEdit">
              <font-awesome-icon :icon="['fas', 'edit']" class="h-4 w-4 text-slate-500" />
              {{ t('common.edit') }}
            </button>
            <button type="button"
              class="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              @click="handleDelete">
              <font-awesome-icon :icon="['fas', 'trash']" class="h-4 w-4" />
              {{ t('common.delete') }}
            </button>
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>
