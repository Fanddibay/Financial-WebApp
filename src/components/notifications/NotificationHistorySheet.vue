<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { formatIDR } from '@/utils/currency'
import { getCategoryIcon } from '@/utils/categoryIcons'
import { useI18n } from 'vue-i18n'
import { usePocketStore } from '@/stores/pocket'
import { useProfileStore } from '@/stores/profile'
import { getTransactionsForDate, buildDummyNotificationItems } from '@/composables/useNotification'
import { useTransactionStore } from '@/stores/transaction'
import { useNotificationStore } from '@/stores/notification'
import type { Transaction } from '@/types/transaction'
import type { NotificationItem } from '@/types/notification'

const props = defineProps<{
  isOpen: boolean
  period: unknown
}>()

const emit = defineEmits<{
  close: []
  'add-transaction': []
}>()

const { t, locale } = useI18n()
const transactionStore = useTransactionStore()
const pocketStore = usePocketStore()
const notificationStore = useNotificationStore()
const profileStore = useProfileStore()

const viewMode = ref<'list' | 'detail'>('list')
const selectedItem = ref<NotificationItem | null>(null)
const selectedTx = ref<Transaction | null>(null)

const notificationItems = computed(() =>
  buildDummyNotificationItems(
    transactionStore.transactions,
    t,
    (id) => notificationStore.isDeleted(id)
  )
)

const detailTransactions = computed(() => {
  const item = selectedItem.value
  if (!item) return []
  const list = getTransactionsForDate(transactionStore.transactions, item.dateStr)
  return [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
})

/** Period context for insights: today | yesterday | week */
const periodContext = computed(() => {
  const item = selectedItem.value
  return item?.periodType ?? 'today'
})

/** Mini Insight: 1-2 insights based on transactions. Non-judgmental, easy to grasp. */
const miniInsights = computed(() => {
  const tx = detailTransactions.value
  if (!tx.length) return []

  const insights: string[] = []
  const period = periodContext.value

  // 1. Most used expense category
  const expenses = tx.filter((t) => t.type === 'expense')
  if (expenses.length >= 1) {
    const byCat = new Map<string, number>()
    for (const t of expenses) {
      const c = t.category || 'Other'
      byCat.set(c, (byCat.get(c) ?? 0) + 1)
    }
    const top = [...byCat.entries()].sort((a, b) => b[1] - a[1])[0]
    if (top) {
      if (period === 'today') insights.push(t('notificationCenter.insightMostCategoryToday', { category: top[0] }))
      else if (period === 'yesterday') insights.push(t('notificationCenter.insightMostCategoryYesterday', { category: top[0] }))
      else insights.push(t('notificationCenter.insightMostCategoryWeek', { category: top[0] }))
    }
  }

  // 2. Spending vs Income (if both exist)
  const incomes = tx.filter((t) => t.type === 'income')
  if (incomes.length >= 1 && expenses.length >= 1) {
    const totalIncome = incomes.reduce((s, t) => s + t.amount, 0)
    const totalExpenses = expenses.reduce((s, t) => s + t.amount, 0)
    if (totalExpenses > totalIncome) {
      if (period === 'today') insights.push(t('notificationCenter.insightExpensesHigherToday'))
      else if (period === 'yesterday') insights.push(t('notificationCenter.insightExpensesHigherYesterday'))
      else insights.push(t('notificationCenter.insightExpensesHigherWeek'))
    } else if (totalIncome > totalExpenses) {
      if (period === 'today') insights.push(t('notificationCenter.insightEarnedMoreToday'))
      else if (period === 'yesterday') insights.push(t('notificationCenter.insightEarnedMoreYesterday'))
      else insights.push(t('notificationCenter.insightEarnedMoreWeek'))
    }
  }

  // 3. Time of day (if we have room)
  if (insights.length < 2 && tx.length >= 2) {
    const bySlot = { morning: 0, afternoon: 0, evening: 0, night: 0 }
    for (const t of tx) {
      const h = new Date(t.date).getHours()
      if (h >= 0 && h < 6) bySlot.night++
      else if (h >= 6 && h < 12) bySlot.morning++
      else if (h >= 12 && h < 18) bySlot.afternoon++
      else bySlot.evening++
    }
    const topSlot = (['morning', 'afternoon', 'evening', 'night'] as const).sort(
      (a, b) => bySlot[b] - bySlot[a]
    )[0]
    if (bySlot[topSlot] >= 2) {
      if (topSlot === 'night') insights.push(t('notificationCenter.insightTimeNight'))
      else if (topSlot === 'morning') insights.push(t('notificationCenter.insightTimeMorning'))
      else if (topSlot === 'afternoon') insights.push(t('notificationCenter.insightTimeAfternoon'))
      else insights.push(t('notificationCenter.insightTimeEvening'))
    }
  }

  // 4. Pocket usage (if room and multiple pockets used)
  if (insights.length < 2 && tx.length >= 2) {
    const byPocket = new Map<string, number>()
    for (const t of tx) {
      const p = pocketStore.getPocketById(t.pocketId)?.name ?? t.pocketId
      byPocket.set(p, (byPocket.get(p) ?? 0) + 1)
    }
    const pockets = [...byPocket.entries()]
    if (pockets.length >= 2) {
      const topPocket = pockets.sort((a, b) => b[1] - a[1])[0]
      if (topPocket && topPocket[1] >= 2) {
        insights.push(t('notificationCenter.insightPocket', { pocket: topPocket[0] }))
      }
    }
  }

  return insights.slice(0, 2)
})

const showInsightFallback = computed(() => miniInsights.value.length === 0)

const sheetTitle = computed(() => {
  if (viewMode.value === 'detail') return t('notificationHistory.title')
  return t('notificationCenter.title')
})

const sheetSubtitle = computed(() => {
  if (viewMode.value === 'detail' && selectedItem.value) return selectedItem.value.relativeTimeLabel
  return ''
})

function isRead(id: string) {
  return notificationStore.isRead(id)
}

function handleItemClick(item: NotificationItem) {
  notificationStore.markAsRead(item.id)
  selectedItem.value = item
  viewMode.value = 'detail'
}

function handleEnvelopeClick(e: Event, item: NotificationItem) {
  e.stopPropagation()
  notificationStore.markAsRead(item.id)
  selectedItem.value = item
  viewMode.value = 'detail'
}

function handleDelete(e: Event, item: NotificationItem) {
  e.stopPropagation()
  const id = item.id
  // Defer store update to avoid insertBefore(null) when patching list inside Teleport+Transition
  setTimeout(() => {
    notificationStore.deleteNotification(id)
  }, 80)
}

function goBack() {
  viewMode.value = 'list'
  selectedItem.value = null
}

function handleTxClick(tx: Transaction) {
  selectedTx.value = tx
}

function closeDetail() {
  selectedTx.value = null
}

function handleClose() {
  emit('close')
  closeDetail()
  goBack()
}

function pocketName(id: string) {
  return pocketStore.getPocketById(id)?.name ?? '-'
}

function formatTxDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(locale.value === 'id' ? 'id-ID' : 'en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

watch(
  () => props.isOpen,
  (open) => {
    if (!open) {
      viewMode.value = 'list'
      selectedItem.value = null
      selectedTx.value = null
    }
  }
)
</script>

<template>
  <BottomSheet
    :is-open="isOpen"
    :title="sheetTitle"
    :subtitle="sheetSubtitle"
    max-height="65"
    @close="emit('close')"
  >
    <!-- List view: satu root div agar patch di dalam Teleport tidak memicu insertBefore(null) -->
    <template v-if="viewMode === 'list'">
      <div class="notification-list-root">
        <!-- Hint when notifications OFF -->
        <div
          v-if="!profileStore.profile.notificationsEnabled"
          class="mb-4 rounded-xl bg-amber-50 px-4 py-3 dark:bg-amber-900/20"
        >
          <p class="text-sm leading-snug text-amber-800 dark:text-amber-200">
            {{ t('notificationCenter.notificationsOffHint') }}
          </p>
        </div>
        <!-- Empty state -->
        <div
          v-else-if="notificationItems.length === 0"
          class="flex flex-col items-center justify-center py-14 px-4 text-center"
        >
          <span
            class="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-brand/10 text-4xl text-brand dark:bg-brand/20"
            aria-hidden="true"
          >
            <font-awesome-icon :icon="['fas', 'bell']" class="h-10 w-10" />
          </span>
          <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {{ t('notificationCenter.emptyTitle') }}
          </h2>
          <p class="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
            {{ t('notificationCenter.emptySubtitle') }}
          </p>
          <BaseButton variant="primary" size="lg" class="mt-6" @click="emit('add-transaction'); emit('close')">
            <font-awesome-icon :icon="['fas', 'plus']" class="mr-2" />
            {{ t('home.addTransaction') }}
          </BaseButton>
        </div>

        <!-- Notification list: TransitionGroup avoids insertBefore when removing items -->
        <TransitionGroup v-else tag="div" name="list" class="space-y-2">
          <div
            v-for="item in notificationItems"
            :key="item.id"
            role="button"
            tabindex="0"
            :class="[
              'flex w-full cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-left transition',
              isRead(item.id)
                ? 'border-slate-200 bg-slate-50/50 text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400'
                : 'border-slate-200 bg-white font-medium text-slate-900 hover:bg-slate-50 active:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700/50 dark:active:bg-slate-700',
            ]"
            @click="handleItemClick(item)"
            @keydown.enter.space.prevent="handleItemClick(item)"
          >
            <button
              type="button"
              :class="[
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition',
                isRead(item.id)
                  ? 'bg-slate-200 text-slate-500 dark:bg-slate-600 dark:text-slate-400'
                  : 'bg-brand/15 text-brand dark:bg-brand/25',
              ]"
              :aria-label="isRead(item.id) ? 'Open' : 'Unread'"
              @click.stop="handleEnvelopeClick($event, item)"
            >
              <font-awesome-icon
                :icon="['fas', isRead(item.id) ? 'envelope-open' : 'envelope']"
                class="h-5 w-5"
              />
            </button>
            <div class="min-w-0 flex-1">
              <p class="line-clamp-2 text-sm">{{ item.summary }}</p>
              <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {{ item.relativeTimeLabel }}
              </p>
            </div>
            <button
              type="button"
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-600 dark:hover:text-slate-300"
              :aria-label="t('common.delete')"
              @click.stop="handleDelete($event, item)"
            >
              <font-awesome-icon :icon="['fas', 'trash']" class="h-4 w-4" />
            </button>
          </div>
        </TransitionGroup>
      </div>
    </template>

    <!-- Detail view: Summary → Mini Insight → Transaction list -->
    <template v-else>
      <div class="space-y-4">
        <div v-if="detailTransactions.length === 0" class="py-8 text-center text-slate-500 dark:text-slate-400">
          <p>{{ t('notificationCenter.noTransactions') }}</p>
        </div>
        <template v-else>
          <!-- 1. Transaction summary -->
          <div class="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
            <p class="text-base font-medium text-slate-800 dark:text-slate-200">
              {{ selectedItem?.summary }}
            </p>
          </div>

          <!-- 2. Mini Insight -->
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

          <!-- 3. Transaction preview list -->
          <div>
            <p class="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {{ selectedItem?.relativeTimeLabel }}
            </p>
            <div class="space-y-2">
              <button
            v-for="tx in detailTransactions"
            :key="tx.id"
            type="button"
            class="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:bg-slate-50 active:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700/50 dark:active:bg-slate-700"
            @click="handleTxClick(tx)"
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
                'shrink-0 text-sm font-semibold',
                tx.type === 'income'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-900 dark:text-slate-100',
              ]"
            >
              {{ tx.type === 'income' ? '+' : '' }}{{ formatIDR(tx.amount) }}
            </p>
          </button>
            </div>
          </div>
        </template>
      </div>
    </template>

    <!-- Single footer: detail = Back + Tutup; list (with items) = Tutup -->
    <template #footer>
      <div v-if="viewMode === 'detail'" class="flex gap-2">
        <BaseButton variant="secondary" class="flex-1" @click="goBack">
          {{ t('notificationCenter.back') }}
        </BaseButton>
        <BaseButton class="flex-1" @click="handleClose">
          {{ t('common.close') }}
        </BaseButton>
      </div>
      <div v-else-if="notificationItems.length > 0" class="w-full">
        <BaseButton class="w-full" @click="handleClose">
          {{ t('common.close') }}
        </BaseButton>
      </div>
    </template>
  </BottomSheet>

  <!-- Transaction detail popup (secondary sheet) -->
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="selectedTx"
        class="fixed inset-0 z-[60] flex flex-col justify-end bg-black/50"
        @click.self="closeDetail"
      >
        <Transition
          enter-active-class="transition-transform duration-300 ease-out"
          enter-from-class="translate-y-full"
          enter-to-class="translate-y-0"
          leave-active-class="transition-transform duration-200 ease-in"
          leave-from-class="translate-y-0"
          leave-to-class="translate-y-full"
        >
          <div
            v-if="selectedTx"
            class="rounded-t-2xl bg-white p-4 pb-8 dark:bg-slate-800"
            @click.stop
          >
            <div class="mb-4 flex items-center justify-between">
              <h3 class="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {{ t('notificationHistory.title') }}
              </h3>
              <button
                type="button"
                class="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                @click="closeDetail"
              >
                <font-awesome-icon :icon="['fas', 'times']" class="h-5 w-5" />
              </button>
            </div>
            <div v-if="selectedTx" class="space-y-4">
              <div class="flex items-center gap-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-700/30">
                <span
                  class="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white text-2xl shadow-sm dark:bg-slate-800"
                >
                  {{
                    getCategoryIcon(
                      selectedTx.category,
                      selectedTx.type === 'income' ? 'income' : 'expense'
                    )
                  }}
                </span>
                <div class="min-w-0 flex-1">
                  <p class="font-semibold text-slate-900 dark:text-slate-100">
                    {{ selectedTx.description || selectedTx.category || '-' }}
                  </p>
                  <p
                    :class="[
                      'text-lg font-bold',
                      selectedTx.type === 'income'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-900 dark:text-slate-100',
                    ]"
                  >
                    {{ selectedTx.type === 'income' ? '+' : '' }}{{ formatIDR(selectedTx.amount) }}
                  </p>
                </div>
              </div>
              <dl class="space-y-3 text-sm">
                <div class="flex justify-between">
                  <dt class="text-slate-500 dark:text-slate-400">{{ t('txDetail.category') }}</dt>
                  <dd class="font-medium text-slate-900 dark:text-slate-100">
                    {{ selectedTx.category || '-' }}
                  </dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-slate-500 dark:text-slate-400">{{ t('txDetail.date') }}</dt>
                  <dd class="font-medium text-slate-900 dark:text-slate-100">
                    {{ formatTxDate(selectedTx.date) }}
                  </dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-slate-500 dark:text-slate-400">{{ t('txDetail.pocket') }}</dt>
                  <dd class="font-medium text-slate-900 dark:text-slate-100">
                    {{ pocketName(selectedTx.pocketId) }}
                  </dd>
                </div>
                <div v-if="selectedTx.description" class="flex justify-between gap-4">
                  <dt class="shrink-0 text-slate-500 dark:text-slate-400">{{ t('txDetail.notes') }}</dt>
                  <dd class="text-right font-medium text-slate-900 dark:text-slate-100">
                    {{ selectedTx.description }}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* TransitionGroup list: smooth leave so DOM patch doesn't trigger insertBefore */
.list-leave-active {
  position: absolute;
  width: 100%;
  opacity: 0;
  transition: opacity 0.15s ease-out;
}
.list-move {
  transition: transform 0.2s ease;
}
</style>
