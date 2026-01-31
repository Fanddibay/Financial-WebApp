<script setup lang="ts">
import { computed } from 'vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { formatIDR } from '@/utils/currency'
import { getCategoryIcon } from '@/utils/categoryIcons'
import { usePocketStore } from '@/stores/pocket'
import { useI18n } from 'vue-i18n'
import type { Transaction } from '@/types/transaction'

const props = defineProps<{
  isOpen: boolean
  /** Transactions for the selected day (e.g. today) */
  transactions: Transaction[]
}>()

const emit = defineEmits<{
  close: []
}>()

const { t, locale } = useI18n()
const pocketStore = usePocketStore()

const detailTransactions = computed(() =>
  [...props.transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
)

/** Mini insights for today (1–2 lines). */
const miniInsights = computed(() => {
  const tx = detailTransactions.value
  if (!tx.length) return []

  const insights: string[] = []
  const expenses = tx.filter((t) => t.type === 'expense')
  const incomes = tx.filter((t) => t.type === 'income')

  if (expenses.length >= 1) {
    const byCat = new Map<string, number>()
    for (const tr of expenses) {
      const c = tr.category || 'Other'
      byCat.set(c, (byCat.get(c) ?? 0) + 1)
    }
    const top = [...byCat.entries()].sort((a, b) => b[1] - a[1])[0]
    if (top) insights.push(t('notificationCenter.insightMostCategoryToday', { category: top[0] }))
  }

  if (incomes.length >= 1 && expenses.length >= 1) {
    const totalIncome = incomes.reduce((s, tr) => s + tr.amount, 0)
    const totalExpenses = expenses.reduce((s, tr) => s + tr.amount, 0)
    if (totalExpenses > totalIncome) {
      insights.push(t('notificationCenter.insightExpensesHigherToday'))
    } else if (totalIncome > totalExpenses) {
      insights.push(t('notificationCenter.insightEarnedMoreToday'))
    }
  }

  return insights.slice(0, 2)
})

const showInsightFallback = computed(() => miniInsights.value.length === 0)

const summaryText = computed(() => {
  const count = detailTransactions.value.length
  return count === 1
    ? t('home.recordedTodayOne')
    : t('home.recordedToday', { count })
})

function formatTxDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(locale.value === 'id' ? 'id-ID' : 'en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function pocketName(id: string) {
  return pocketStore.getPocketById(id)?.name ?? '-'
}
</script>

<template>
  <BottomSheet
    :is-open="isOpen"
    :title="t('home.activityTitle')"
    :subtitle="t('home.todayLabel')"
    max-height="70"
    @close="emit('close')"
  >
    <div class="space-y-4">
      <!-- Summary card -->
      <div class="rounded-xl bg-slate-100 px-4 py-3 dark:bg-slate-700/40">
        <p class="text-sm text-slate-700 dark:text-slate-300">
          {{ summaryText }}
        </p>
      </div>

      <!-- Insight card -->
      <div class="rounded-xl bg-amber-50/80 px-4 py-3 dark:bg-amber-900/20">
        <div class="flex gap-3">
          <span class="text-lg" aria-hidden="true">✨</span>
          <div class="min-w-0 flex-1 space-y-1">
            <template v-if="showInsightFallback">
              <p class="line-clamp-2 text-sm text-slate-600 dark:text-slate-400">
                {{ t('notificationCenter.insightFallback') }}
              </p>
            </template>
            <template v-else>
              <p
                v-for="(insight, i) in miniInsights"
                :key="i"
                class="line-clamp-2 text-sm text-slate-700 dark:text-slate-300"
              >
                {{ insight }}
              </p>
            </template>
          </div>
        </div>
      </div>

      <!-- Section title -->
      <p class="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {{ t('home.todayLabel') }}
      </p>

      <!-- Transaction list -->
      <div class="space-y-2">
        <div
          v-for="tx in detailTransactions"
          :key="tx.id"
          class="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800"
        >
          <span
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg dark:bg-slate-700"
          >
            {{ getCategoryIcon(tx.category, tx.type === 'income' ? 'income' : 'expense') }}
          </span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
              {{ tx.description || tx.category || '-' }}
            </p>
            <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {{ formatTxDate(tx.date) }}
            </p>
          </div>
          <p
            :class="[
              'shrink-0 text-sm font-semibold tabular-nums',
              tx.type === 'income'
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-slate-900 dark:text-slate-100',
            ]"
          >
            {{ tx.type === 'income' ? '+' : '' }}{{ formatIDR(tx.amount) }}
          </p>
        </div>
      </div>
    </div>

    <template #footer>
      <BaseButton class="w-full" @click="emit('close')">
        {{ t('common.close') }}
      </BaseButton>
    </template>
  </BottomSheet>
</template>
