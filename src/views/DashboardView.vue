<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useTransactions } from '@/composables/useTransactions'
import SummaryCard from '@/components/transactions/SummaryCard.vue'
import CategoryBreakdownChart from '@/components/charts/CategoryBreakdownChart.vue'
import IncomeExpenseComparisonChart from '@/components/charts/IncomeExpenseComparisonChart.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { exportSummaryToPDF } from '@/utils/export'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

type FilterType = 'all' | 'income' | 'expense'
type ChartType = 'bar' | 'line' | 'doughnut'

const { summary, fetchTransactions, getTransactionsByCategory, getTransactionsByDate } = useTransactions()

const filterType = ref<FilterType>('all')
const chartType = ref<ChartType>('bar')

const filteredTransactionsByCategory = computed(() => {
  return getTransactionsByCategory(filterType.value)
})

// Data for comparison chart (when filter is 'all')
const incomeByDate = computed(() => getTransactionsByDate('income'))
const expenseByDate = computed(() => getTransactionsByDate('expense'))

// Check if we have data to show
const hasData = computed(() => {
  if (filterType.value === 'all') {
    return incomeByDate.value.length > 0 || expenseByDate.value.length > 0
  }
  return filteredTransactionsByCategory.value.length > 0
})

onMounted(() => {
  fetchTransactions()
})

function handleExportSummary() {
  const filename = `financial-summary-${new Date().toISOString().split('T')[0]}.pdf`
  exportSummaryToPDF(summary.value, filename)
}

const filterOptions = computed(() => [
  { value: 'all', label: t('common.all') },
  { value: 'income', label: t('transaction.incomeLabel') },
  { value: 'expense', label: t('transaction.expenseLabel') },
])

const chartTypeOptions = computed(() => [
  { value: 'bar', label: t('dashboard.barChart') },
  { value: 'line', label: t('dashboard.lineChart') },
  { value: 'doughnut', label: t('dashboard.doughnutChart') },
])
</script>

<template>
  <div class="mx-auto max-w-[430px] space-y-6 px-4 pb-24 pt-24">
    <PageHeader :title="t('dashboard.title')" :subtitle="t('dashboard.subtitle')">
      <template #right>
        <BaseButton variant="secondary" size="sm" @click="handleExportSummary">
          {{ t('dashboard.export') }}
          <font-awesome-icon :icon="['fas', 'file-pdf']" class="mr-2" />

        </BaseButton>
      </template>
    </PageHeader>

    <SummaryCard :summary="summary" />

    <BaseCard>
      <template #header>
        <div class="sm:items-center sm:justify-between">
          <h2 class="text-lg font-semibold mb-4 text-slate-900 dark:text-slate-100">
            {{ filterType === 'all' ? t('dashboard.comparisonTitle') : t('dashboard.categoryBreakdownTitle') }}
          </h2>
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
            <!-- Filter Dropdown with label -->
            <div class="w-full">
              <label class="block mb-1 text-xs font-medium text-slate-700 dark:text-slate-300" for="filterTypeSelect">
                {{ t('dashboard.selectTransactionType') }}
              </label>
              <BaseSelect id="filterTypeSelect" v-model="filterType" :options="filterOptions" />
            </div>
            <!-- Chart Type Dropdown with label (only show when not 'all') -->
            <div v-if="filterType !== 'all'" class="w-full">
              <label class="block mb-1 text-xs font-medium text-slate-700 dark:text-slate-300" for="chartTypeSelect">
                {{ t('dashboard.chartType') }}
              </label>
              <BaseSelect id="chartTypeSelect" v-model="chartType" :options="chartTypeOptions" />
            </div>
          </div>
        </div>
      </template>

      <!-- Show chart if has data -->
      <template v-if="hasData">
        <!-- Comparison Chart (when filter is 'all') -->
        <IncomeExpenseComparisonChart v-if="filterType === 'all'" :income-data="incomeByDate"
          :expense-data="expenseByDate" />
        <!-- Regular Category Chart (when filter is 'income' or 'expense') -->
        <CategoryBreakdownChart v-else :transactions-by-category="filteredTransactionsByCategory"
          :chart-type="chartType" />
      </template>

      <!-- Show empty state if no data -->
      <template v-else>
        <div class="py-12 text-center text-slate-500 dark:text-slate-400">
          <p>{{ t('dashboard.noTransactions') }}</p>
          <router-link to="/transactions/new" class="mt-4 inline-block">
            <BaseButton>
              <font-awesome-icon :icon="['fas', 'plus']" class="mr-2" />
              {{ t('dashboard.addTransaction') }}
            </BaseButton>
          </router-link>
        </div>
      </template>
    </BaseCard>
  </div>
</template>
