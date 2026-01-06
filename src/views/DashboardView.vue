<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useTransactions } from '@/composables/useTransactions'
import SummaryCard from '@/components/transactions/SummaryCard.vue'
import CategoryBreakdownChart from '@/components/charts/CategoryBreakdownChart.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { exportSummaryToPDF } from '@/utils/export'

type FilterType = 'all' | 'income' | 'expense'
type ChartType = 'bar' | 'line' | 'doughnut'

const { summary, fetchTransactions, getTransactionsByCategory } = useTransactions()

const filterType = ref<FilterType>('all')
const chartType = ref<ChartType>('bar')

const filteredTransactionsByCategory = computed(() => {
  return getTransactionsByCategory(filterType.value)
})

onMounted(() => {
  fetchTransactions()
})

function handleExportSummary() {
  const filename = `financial-summary-${new Date().toISOString().split('T')[0]}.pdf`
  exportSummaryToPDF(summary.value, filename)
}

const filterOptions = [
  { value: 'all', label: 'All' },
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
]

const chartTypeOptions = [
  { value: 'bar', label: 'Bar Chart' },
  { value: 'line', label: 'Line Chart' },
  { value: 'doughnut', label: 'Doughnut Chart' },
]
</script>

<template>
  <div class="mx-auto max-w-[430px] space-y-6 px-4 pb-24 pt-8">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400">Pantau kesehatan keuangan kamu</p>
      </div>
      <BaseButton variant="secondary" size="sm" @click="handleExportSummary">
        <font-awesome-icon :icon="['fas', 'file-pdf']" class="mr-2" />
        Export
      </BaseButton>
    </div>

    <SummaryCard :summary="summary" />

    <BaseCard v-if="filteredTransactionsByCategory.length > 0">
      <template #header>
        <div class="sm:items-center sm:justify-between">
          <h2 class="text-lg font-semibold mb-4 text-slate-900 dark:text-slate-100">Rincian Kategori</h2>
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
            <!-- Filter Dropdown with label -->
            <div class="w-full">
              <label class="block mb-1 text-xs font-medium text-slate-700 dark:text-slate-300" for="filterTypeSelect">
                Pilih Jenis Transaksi
              </label>
              <BaseSelect id="filterTypeSelect" v-model="filterType" :options="filterOptions" />
            </div>
            <!-- Chart Type Dropdown with label -->
            <div class="w-full">
              <label class="block mb-1 text-xs font-medium text-slate-700 dark:text-slate-300" for="chartTypeSelect">
                Tipe Chart
              </label>
              <BaseSelect id="chartTypeSelect" v-model="chartType" :options="chartTypeOptions" />
            </div>
          </div>
        </div>
      </template>
      <CategoryBreakdownChart :transactions-by-category="filteredTransactionsByCategory" :chart-type="chartType" />
    </BaseCard>

    <BaseCard v-else>
      <div class="py-12 text-center text-slate-500 dark:text-slate-400">
        <p>Belum ada transaksi nih. Tambahkan transaksi dulu untuk lihat rinciannya!</p>
        <router-link to="/transactions/new" class="mt-4 inline-block">
          <BaseButton>
            <font-awesome-icon :icon="['fas', 'plus']" class="mr-2" />
            Tambah Transaksi
          </BaseButton>
        </router-link>
      </div>
    </BaseCard>
  </div>
</template>
