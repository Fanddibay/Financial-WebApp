<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import RecurringFormSheet from '@/components/recurring/RecurringFormSheet.vue'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import { useRecurringStore } from '@/stores/recurring'
import { usePocketStore } from '@/stores/pocket'
import { useToastStore } from '@/stores/toast'
import { formatIDR } from '@/utils/currency'
import { useI18n } from 'vue-i18n'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import type { RecurringTransaction } from '@/types/recurring'

const { t } = useI18n()
const recurringStore = useRecurringStore()
const pocketStore = usePocketStore()
const toast = useToastStore()

const showFormSheet = ref(false)
const editingId = ref<string | null>(null)
const showDeleteConfirm = ref(false)
const deletingId = ref<string | null>(null)

const items = computed(() => recurringStore.items)
const sortedItems = computed(() =>
  [...items.value].sort((a, b) => b.created_at.localeCompare(a.created_at)),
)

function getFrequencyLabel(item: RecurringTransaction): string {
  switch (item.frequency) {
    case 'daily':
      return t('recurring.frequencyDaily')
    case 'weekly':
      return t('recurring.frequencyWeekly')
    case 'monthly':
      return t('recurring.frequencyMonthly')
    case 'custom':
      return t('recurring.frequencyCustomEvery', { days: item.custom_interval_days ?? 7 })
    default:
      return ''
  }
}

function getNextDate(item: RecurringTransaction): string {
  return recurringStore.getNextScheduledDate(item)
}

function pocketName(id: string): string {
  return pocketStore.getPocketById(id)?.name ?? '-'
}

function openCreate() {
  editingId.value = null
  showFormSheet.value = true
}

function openEdit(id: string) {
  editingId.value = id
  showFormSheet.value = true
}

function handleSaved() {
  toast.success(editingId.value ? t('recurring.editSuccess') : t('recurring.createSuccess'))
}

function confirmDelete(id: string) {
  deletingId.value = id
  showDeleteConfirm.value = true
}

async function doDelete() {
  if (!deletingId.value) return
  recurringStore.deleteRecurring(deletingId.value)
  toast.success(t('recurring.deleteSuccess'))
  deletingId.value = null
  showDeleteConfirm.value = false
}

function toggleActive(item: RecurringTransaction) {
  const nextActive = !item.is_active
  recurringStore.updateRecurring(item.id, { is_active: nextActive })
  toast.success(nextActive ? t('recurring.toggleActive') : t('recurring.togglePaused'))
}

function formatDisplayDate(d: string): string {
  return new Date(d).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

onMounted(() => {
  recurringStore.fetchRecurrings()
  pocketStore.fetchPockets()
})
</script>

<template>
  <div class="mx-auto max-w-[430px] px-4 pb-32 pt-4">
    <PageHeader
      :title="t('recurring.title')"
      :subtitle="t('recurring.subtitle')"
      :show-back="true"
    >
      <template #right>
        <BaseButton variant="primary" size="sm" @click="openCreate">
          <font-awesome-icon :icon="['fas', 'plus']" class="mr-1.5 h-3 w-3" />
          {{ t('recurring.createButton') }}
        </BaseButton>
      </template>
    </PageHeader>

    <div class="pt-16">
      <div v-if="sortedItems.length" class="space-y-3">
        <div
          v-for="item in sortedItems"
          :key="item.id"
          class="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"
        >
          <div class="min-w-0 flex-1">
            <p class="truncate font-semibold text-slate-900 dark:text-slate-100">
              {{ item.name }}
            </p>
            <p
              :class="[
                'mt-0.5 text-sm font-semibold tabular-nums',
                item.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300',
              ]"
            >
              {{ formatIDR(item.amount) }}
            </p>
            <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {{ getFrequencyLabel(item) }} · {{ pocketName(item.pocket_id) }}
            </p>
            <p class="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
              {{ t('recurring.nextScheduled') }}: {{ formatDisplayDate(getNextDate(item)) }}
            </p>
          </div>
          <div class="flex shrink-0 flex-col items-end gap-2">
            <button
              type="button"
              :class="[
                'relative inline-flex h-8 w-14 shrink-0 rounded-full border-2 transition',
                item.is_active
                  ? 'border-brand bg-brand'
                  : 'border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-700',
              ]"
              :aria-label="item.is_active ? t('recurring.active') : t('recurring.paused')"
              @click="toggleActive(item)"
            >
              <span
                :class="[
                  'inline-block h-6 w-6 rounded-full bg-white shadow transition',
                  item.is_active ? 'translate-x-6' : 'translate-x-1',
                ]"
              />
            </button>
            <div class="flex gap-1">
              <button
                type="button"
                class="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                :aria-label="t('common.edit')"
                @click="openEdit(item.id)"
              >
                <font-awesome-icon :icon="['fas', 'edit']" class="h-4 w-4" />
              </button>
              <button
                type="button"
                class="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-slate-700 dark:hover:text-red-400"
                :aria-label="t('common.delete')"
                @click="confirmDelete(item.id)"
              >
                <font-awesome-icon :icon="['fas', 'trash-alt']" class="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div
        v-else
        class="flex flex-col items-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-12 px-6 text-center dark:border-slate-700 dark:bg-slate-800/30"
      >
        <span
          class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-200 text-3xl dark:bg-slate-700"
          aria-hidden="true"
        >
          🗓
        </span>
        <h3 class="font-semibold text-slate-900 dark:text-slate-100">
          {{ t('recurring.emptyTitle') }}
        </h3>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {{ t('recurring.emptySubtitle') }}
        </p>
        <BaseButton variant="primary" class="mt-6" @click="openCreate">
          <font-awesome-icon :icon="['fas', 'plus']" class="mr-2 h-4 w-4" />
          {{ t('recurring.createButton') }}
        </BaseButton>
      </div>
    </div>
  </div>

  <RecurringFormSheet
    :is-open="showFormSheet"
    :editing-id="editingId"
    @close="showFormSheet = false; editingId = null"
    @saved="handleSaved"
  />

  <ConfirmModal
    :is-open="showDeleteConfirm"
    :title="t('common.delete')"
    :message="t('recurring.deleteConfirm')"
    :confirm-text="t('common.delete')"
    variant="danger"
    @close="showDeleteConfirm = false; deletingId = null"
    @confirm="doDelete"
  />
</template>
