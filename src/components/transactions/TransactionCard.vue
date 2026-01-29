<script setup lang="ts">
import { computed } from 'vue'
import type { Transaction } from '@/types/transaction'
import BaseButton from '@/components/ui/BaseButton.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { formatIDR } from '@/utils/currency'
import { getCategoryIcon } from '@/utils/categoryIcons'
import { usePocketStore } from '@/stores/pocket'

interface Props {
  transaction: Transaction
  /** When listing per-pocket, pass current pocket id to show transfer direction (from/to). */
  contextPocketId?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  edit: [id: string]
  delete: [id: string]
}>()

const pocketStore = usePocketStore()

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
  return getCategoryIcon(props.transaction.category, props.transaction.type)
})

const displayTitle = computed(() => {
  if (!isTransfer.value) return props.transaction.description
  const pid = props.contextPocketId
  const fromId = props.transaction.pocketId
  const toId = props.transaction.transferToPocketId
  const fromName = toId ? pocketStore.getPocketById(fromId)?.name ?? fromId : ''
  const toName = toId ? pocketStore.getPocketById(toId)?.name ?? toId : ''
  if (pid === toId) return `From ${fromName}`
  return `To ${toName}`
})

const isInflow = computed(() => {
  if (!isTransfer.value) return props.transaction.type === 'income'
  return props.contextPocketId === props.transaction.transferToPocketId
})

const cardClass = computed(() => {
  if (isTransfer.value) return 'border-slate-200 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-800/30'
  return props.transaction.type === 'income'
    ? 'border-green-200 bg-green-50/50 dark:border-green-900/20'
    : 'border-red-200 bg-red-50/50 dark:border-red-900/20'
})

const iconBgClass = computed(() => {
  if (isTransfer.value) return 'bg-slate-200 dark:bg-slate-600'
  return props.transaction.type === 'income' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
})

const amountClass = computed(() => {
  if (isTransfer.value) return isInflow.value ? 'text-green-700 dark:text-green-400' : 'text-slate-700 dark:text-slate-300'
  return props.transaction.type === 'income' ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
})

const allowEdit = computed(() => !isTransfer.value)
</script>

<template>
  <div :class="['flex items-center justify-between rounded-xl border p-2.5 transition hover:shadow-md', cardClass]">
    <div class="flex-1">
      <div class="flex items-center gap-3">
        <div :class="['flex h-8 w-8 items-center justify-center rounded-lg text-lg', iconBgClass]">
          {{ categoryIcon }}
        </div>
        <div class="flex-1">
          <h3 class="font-semibold text-slate-900 dark:text-slate-100">{{ displayTitle }}</h3>
          <p v-if="!isTransfer" class="text-sm text-slate-600 dark:text-slate-400">
            {{ categoryIcon }} {{ transaction.category }}
          </p>
          <p v-else class="text-sm text-slate-500 dark:text-slate-400">Transfer</p>
          <p class="text-xs text-slate-500 dark:text-slate-400">{{ formattedDate }}</p>
        </div>
      </div>
    </div>
    <div class="ml-4 flex items-center gap-2">
      <span :class="['text-sm font-bold', amountClass]">
        {{ isInflow ? '+' : '-' }}{{ formattedAmount }}
      </span>
      <div class="grid gap-1">
        <BaseButton
          v-if="allowEdit"
          variant="ghost"
          size="sm"
          @click="emit('edit', transaction.id)"
        >
          <font-awesome-icon :icon="['fas', 'edit']" />
        </BaseButton>
        <BaseButton variant="ghost" size="sm" @click="emit('delete', transaction.id)">
          <font-awesome-icon :icon="['fas', 'trash']" />
        </BaseButton>
      </div>
    </div>
  </div>
</template>
