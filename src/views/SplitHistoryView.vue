<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/layout/PageHeader.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useSplitStore } from '@/stores/split'
import { useToastStore } from '@/stores/toast'
import { formatIDR } from '@/utils/currency'
import { useI18n } from 'vue-i18n'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import type { Split } from '@/types/split'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const { t, locale } = useI18n()
const router = useRouter()
const splitStore = useSplitStore()
const toast = useToastStore()

const showExportDropdown = ref(false)
const exportDropdownRef = ref<HTMLElement | null>(null)

const sortedSplits = computed(() =>
  [...splitStore.splits].sort((a, b) => b.created_at.localeCompare(a.created_at)),
)
const hasSplitsToExport = computed(() => sortedSplits.value.length > 0)

function getFinalTotal(split: Split): number {
  if (split.final_total != null) return split.final_total
  const subtotal = split.subtotal ?? split.total_bill
  return subtotal + Math.round((subtotal * split.tax_percent) / 100) + Math.round((subtotal * split.service_percent) / 100)
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString(locale.value === 'id' ? 'id-ID' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function openDetail(id: string) {
  router.push({ name: 'split-history-detail', params: { id } })
}

function getExportRows() {
  return sortedSplits.value.map((split) => ({
    id: split.id,
    place: split.place_name || t('split.patungan'),
    created_at: formatDate(split.created_at),
    participants: split.participants.length,
    my_portion: split.my_portion,
    total_bill: getFinalTotal(split),
    tax_percent: split.tax_percent,
    service_percent: split.service_percent,
    participant_names: split.participants.map((p) => (p.isMe ? t('split.you') : p.name)).join(', '),
  }))
}

function exportExcel() {
  const rows = getExportRows()
  if (!rows.length) {
    toast.warning(t('splitHistory.exportEmpty'))
    return
  }

  const worksheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'SplitHistory')
  const date = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(workbook, `split-history-${date}.xlsx`)
  toast.success(t('splitHistory.exportSuccessExcel'))
}

function exportPdf() {
  const rows = getExportRows()
  if (!rows.length) {
    toast.warning(t('splitHistory.exportEmpty'))
    return
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
  doc.setFontSize(14)
  doc.text(t('splitHistory.title'), 40, 40)

  autoTable(doc, {
    startY: 56,
    head: [[
      'Place',
      'Created',
      'Participants',
      'Your Portion',
      'Total',
    ]],
    body: rows.map((r) => [
      String(r.place),
      String(r.created_at),
      String(r.participants),
      formatIDR(Number(r.my_portion) || 0),
      formatIDR(Number(r.total_bill) || 0),
    ]),
    styles: {
      fontSize: 9,
      cellPadding: 6,
    },
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      fontStyle: 'bold',
    },
  })

  const date = new Date().toISOString().slice(0, 10)
  doc.save(`split-history-${date}.pdf`)
  toast.success(t('splitHistory.exportSuccessPdf'))
}

function closeExportDropdown(e?: MouseEvent) {
  if (e && exportDropdownRef.value && exportDropdownRef.value.contains(e.target as Node)) return
  showExportDropdown.value = false
}

onMounted(() => {
  splitStore.fetchSplits()
  document.addEventListener('click', closeExportDropdown)
})

onUnmounted(() => {
  document.removeEventListener('click', closeExportDropdown)
})
</script>

<template>
  <div class="mx-auto max-w-[430px] space-y-4 px-4 pb-32 pt-24">
    <PageHeader :title="t('splitHistory.title')" :subtitle="t('splitHistory.subtitle')" :show-back="true">
      <template #right>
        <div ref="exportDropdownRef" class="relative">
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            :class="{ 'ring-2 ring-brand ring-offset-2 dark:ring-offset-slate-900': showExportDropdown }"
            :disabled="!hasSplitsToExport"
            :title="t('transactions.exportFile')"
            @click.stop="showExportDropdown = !showExportDropdown"
          >
            {{ t('transactions.exportFile') }}
            <font-awesome-icon :icon="['fas', showExportDropdown ? 'chevron-up' : 'chevron-down']" class="h-3 w-3 text-slate-400" />
          </button>

          <Transition
            enter-active-class="transition duration-150 ease-out"
            enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100"
            leave-active-class="transition duration-100 ease-in"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95"
          >
            <div
              v-if="showExportDropdown"
              class="absolute right-0 top-full z-50 mt-1.5 min-w-[140px] rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-600 dark:bg-slate-800"
            >
              <button
                type="button"
                class="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/50"
                :disabled="!hasSplitsToExport"
                @click.stop="showExportDropdown = false; exportExcel()"
              >
                <font-awesome-icon :icon="['fas', 'file-excel']" class="h-4 w-4 text-green-600 dark:text-green-400" />
                {{ t('transactions.exportExcel') }}
              </button>
              <button
                type="button"
                class="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/50"
                :disabled="!hasSplitsToExport"
                @click.stop="showExportDropdown = false; exportPdf()"
              >
                <font-awesome-icon :icon="['fas', 'file-pdf']" class="h-4 w-4 text-red-600 dark:text-red-400" />
                {{ t('transactions.exportPDF') }}
              </button>
            </div>
          </Transition>
        </div>
      </template>
    </PageHeader>

    <div v-if="sortedSplits.length" class="mt-8 space-y-3">
      <button
        v-for="split in sortedSplits"
        :key="split.id"
        type="button"
        class="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-brand/40 hover:shadow dark:border-slate-700 dark:bg-slate-800 dark:hover:border-brand/40"
        @click="openDetail(split.id)"
      >
        <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
          <font-awesome-icon :icon="['fas', 'receipt']" class="h-5 w-5" />
        </div>

        <div class="min-w-0 flex-1">
          <p class="truncate font-semibold text-slate-900 dark:text-slate-100">
            {{ split.place_name || t('split.patungan') }}
          </p>
          <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {{ t('splitHistory.createdAt') }}: {{ formatDate(split.created_at) }}
          </p>
          <p class="mt-1 text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-200">
            {{ t('splitHistory.totalBill') }}: {{ formatIDR(getFinalTotal(split)) }}
          </p>
          <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {{ t('splitHistory.participants') }}: {{ split.participants.length }} · {{ t('splitHistory.yourPortion') }}: {{ formatIDR(split.my_portion) }}
          </p>
        </div>

        <font-awesome-icon :icon="['fas', 'chevron-right']" class="h-4 w-4 shrink-0 text-slate-400" />
      </button>
    </div>

    <div
      v-else
      class="mt-8 flex flex-col items-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-12 px-6 text-center dark:border-slate-700 dark:bg-slate-800/30"
    >
      <span class="mb-4 text-3xl" aria-hidden="true">🧾</span>
      <h3 class="font-semibold text-slate-900 dark:text-slate-100">{{ t('splitHistory.emptyTitle') }}</h3>
      <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ t('splitHistory.emptySubtitle') }}</p>
      <BaseButton class="mt-5" @click="router.push('/profile')">{{ t('nav.profile') }}</BaseButton>
    </div>
  </div>
</template>
