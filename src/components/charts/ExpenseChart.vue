<script setup lang="ts">
import { computed } from 'vue'
import { Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { formatIDR } from '@/utils/currency'

ChartJS.register(ArcElement, Tooltip, Legend)

interface Props {
  transactionsByCategory: Array<{ category: string; total: number; count: number }>
  totalExpenses: number
  label?: string
  isNegative?: boolean
  isExpense?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  label: 'Total Expenses',
  isNegative: false,
  isExpense: false,
})

const chartData = computed(() => {
  const colors = [
    '#10b981', // green-500
    '#3b82f6', // blue-500
    '#f59e0b', // amber-500
    '#ef4444', // red-500
    '#8b5cf6', // violet-500
    '#ec4899', // pink-500
    '#06b6d4', // cyan-500
    '#84cc16', // lime-500
  ]

  return {
    labels: props.transactionsByCategory.map((item) => item.category),
    datasets: [
      {
        data: props.transactionsByCategory.map((item) => item.total),
        backgroundColor: colors.slice(0, props.transactionsByCategory.length),
        borderWidth: 0,
      },
    ],
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        padding: 15,
        font: {
          size: 12,
        },
        usePointStyle: true,
      },
    },
    tooltip: {
      callbacks: {
        label: (context: { label?: string; parsed: number }) => {
          const label = context.label || ''
          const value = formatIDR(context.parsed)
          const percentage = ((context.parsed / props.totalExpenses) * 100).toFixed(1)
          return `${label}: ${value} (${percentage}%)`
        },
      },
    },
  },
  cutout: '70%',
}
</script>

<template>
  <div class="relative">
    <div class="mx-auto h-64 w-64">
      <Doughnut :data="chartData" :options="chartOptions" />
    </div>
    <div class="absolute inset-4 flex items-center justify-center">
      <div class="text-center justify-center">
        <p class="text-xs text-slate-500">{{ label }}</p>
        <p :class="[
          'text-2xl font-bold',
          isNegative || isExpense
            ? 'text-red-600 dark:text-red-400'
            : 'text-slate-900 dark:text-slate-100'
        ]">
          {{ formatIDR(totalExpenses) }}
        </p>
      </div>
    </div>
  </div>
</template>
