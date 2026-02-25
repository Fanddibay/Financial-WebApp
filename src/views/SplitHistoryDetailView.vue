<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import PageHeader from '@/components/layout/PageHeader.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useSplitStore } from '@/stores/split'
import { formatIDR } from '@/utils/currency'
import { useI18n } from 'vue-i18n'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useToastStore } from '@/stores/toast'
import type { Split } from '@/types/split'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const { t, locale } = useI18n()
const route = useRoute()
const splitStore = useSplitStore()
const toast = useToastStore()

const splitId = computed(() => String(route.params.id || ''))
const split = computed(() => splitStore.getSplitById(splitId.value))

function getFinalTotal(data: Split): number {
  if (data.final_total != null) return data.final_total
  const subtotal = data.subtotal ?? data.total_bill
  return subtotal + Math.round((subtotal * data.tax_percent) / 100) + Math.round((subtotal * data.service_percent) / 100)
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString(locale.value === 'id' ? 'id-ID' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function displayUnitPrice(item: NonNullable<Split['items']>[number]): number {
  if ((item.unit_price ?? 0) > 0) return item.unit_price as number
  const qty = Math.max(1, item.qty ?? 1)
  return Math.round(item.price / qty)
}

function exportDetailExcel() {
  if (!split.value) {
    toast.warning(t('splitHistory.exportEmpty'))
    return
  }

  const current = split.value
  const summaryRows = [
    {
      id: current.id,
      place: current.place_name || t('split.patungan'),
      created_at: formatDate(current.created_at),
      total_bill: getFinalTotal(current),
      my_portion: current.my_portion,
      participants: current.participants.length,
      tax_percent: current.tax_percent,
      service_percent: current.service_percent,
    },
  ]

  const itemRows = (current.items ?? []).map((item) => ({
    name: item.name,
    qty: item.qty ?? 1,
    unit_price: displayUnitPrice(item),
    line_total: item.price,
    assigned_to: item.participant_name === 'Kamu' ? t('split.you') : item.participant_name,
  }))

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), 'Summary')
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(itemRows), 'Items')

  const date = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(workbook, `split-detail-${date}.xlsx`)
  toast.success(t('splitHistory.exportSuccessExcel'))
}

function exportDetailPdf() {
  if (!split.value) {
    toast.warning(t('splitHistory.exportEmpty'))
    return
  }

  const current = split.value
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })

  doc.setFontSize(14)
  doc.text(t('splitHistory.detailTitle'), 40, 40)
  doc.setFontSize(10)
  doc.text(`${t('splitHistory.createdAt')}: ${formatDate(current.created_at)}`, 40, 58)
  doc.text(`${t('splitHistory.totalBill')}: ${formatIDR(getFinalTotal(current))}`, 40, 74)
  doc.text(`${t('splitHistory.yourPortion')}: ${formatIDR(current.my_portion)}`, 40, 90)

  autoTable(doc, {
    startY: 108,
    head: [[t('splitHistory.participants'), t('splitHistory.totalBill')]],
    body: current.participants.map((person) => [
      person.isMe ? t('split.you') : person.name,
      formatIDR(person.amount),
    ]),
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
  })

  const items = current.items ?? []
  if (items.length) {
    const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 108
    autoTable(doc, {
      startY: finalY + 16,
      head: [[t('splitHistory.items'), t('splitHistory.qtyShort'), 'Unit', 'Total', t('splitHistory.participants')]],
      body: items.map((item) => [
        item.name,
        String(item.qty ?? 1),
        formatIDR(displayUnitPrice(item)),
        formatIDR(item.price),
        item.participant_name === 'Kamu' ? t('split.you') : item.participant_name,
      ]),
      styles: { fontSize: 9, cellPadding: 6 },
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
    })
  }

  const date = new Date().toISOString().slice(0, 10)
  doc.save(`split-detail-${date}.pdf`)
  toast.success(t('splitHistory.exportSuccessPdf'))
}

onMounted(() => {
  splitStore.fetchSplits()
})
</script>

<template>
  <div class="mx-auto max-w-[430px] px-4 pb-32 pt-24">
    <PageHeader :title="t('splitHistory.detailTitle')" :subtitle="split?.place_name || t('split.patungan')" :show-back="true" />

    <div class="mt-8 space-y-4" v-if="split">
      <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <p class="text-sm text-slate-500 dark:text-slate-400">{{ t('splitHistory.createdAt') }}: {{ formatDate(split.created_at) }}</p>
        <p class="mt-2 text-xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{{ formatIDR(getFinalTotal(split)) }}</p>
        <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">{{ t('splitHistory.totalBill') }}</p>

        <div class="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div class="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-700/50">
            <p class="text-xs text-slate-500 dark:text-slate-400">{{ t('splitHistory.taxService') }}</p>
            <p class="font-medium">{{ split.tax_percent }}% + {{ split.service_percent }}%</p>
          </div>
          <div class="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-700/50">
            <p class="text-xs text-slate-500 dark:text-slate-400">{{ t('splitHistory.yourPortion') }}</p>
            <p class="font-medium tabular-nums">{{ formatIDR(split.my_portion) }}</p>
          </div>
        </div>
      </div>

      <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-100">{{ t('splitHistory.splitSummary') }}</h3>
        <div class="mt-3 space-y-2">
          <div v-for="person in split.participants" :key="person.name" class="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-700/50">
            <span class="text-sm text-slate-700 dark:text-slate-200">{{ person.isMe ? t('split.you') : person.name }}</span>
            <span class="text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">{{ formatIDR(person.amount) }}</span>
          </div>
        </div>
      </div>

      <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-100">{{ t('splitHistory.items') }}</h3>

        <div v-if="split.items && split.items.length" class="mt-3 space-y-2">
          <div v-for="(item, idx) in split.items" :key="`${item.name}-${idx}`" class="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-700/50">
            <div class="flex items-center justify-between gap-2">
              <p class="min-w-0 truncate text-sm font-medium text-slate-900 dark:text-slate-100">{{ item.name }}</p>
              <p class="shrink-0 text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-200">{{ formatIDR(item.price) }}</p>
            </div>
            <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {{ t('splitHistory.qtyShort') }}: {{ item.qty ?? 1 }} · {{ formatIDR(displayUnitPrice(item)) }} · {{ item.participant_name === 'Kamu' ? t('split.you') : item.participant_name }}
            </p>
          </div>
        </div>

        <p v-else class="mt-2 text-sm text-slate-500 dark:text-slate-400">{{ t('splitHistory.noItems') }}</p>
      </div>

      <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <p class="text-xs font-medium text-slate-500 dark:text-slate-400">{{ t('splitHistory.exportTo') }}</p>
        <div class="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            class="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30"
            @click="exportDetailPdf"
          >
            <font-awesome-icon :icon="['fas', 'file-pdf']" class="h-4 w-4" />
            {{ t('splitHistory.exportPdf') }}
          </button>
          <button
            type="button"
            class="flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
            @click="exportDetailExcel"
          >
            <font-awesome-icon :icon="['fas', 'file-excel']" class="h-4 w-4" />
            {{ t('splitHistory.exportExcel') }}
          </button>
        </div>
      </div>
    </div>

    <div class="mt-8" v-else>
      <div class="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-10 px-5 text-center dark:border-slate-700 dark:bg-slate-800/30">
        <p class="font-semibold text-slate-900 dark:text-slate-100">{{ t('splitHistory.emptyTitle') }}</p>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ t('splitHistory.emptySubtitle') }}</p>
        <BaseButton class="mt-4" @click="$router.back()">{{ t('nav.back') }}</BaseButton>
      </div>
    </div>
  </div>
</template>
