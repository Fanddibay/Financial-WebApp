<script setup lang="ts">
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { formatIDR } from '@/utils/currency'

ChartJS.register(
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  Legend
)

interface DateData {
  date: string
  total: number
  count: number
}

interface Props {
  incomeData: DateData[]
  expenseData: DateData[]
}

const props = defineProps<Props>()

// Colors with dark mode support
const incomeColor = '#10b981' // green-500 - works well in both light and dark
const expenseColor = '#ef4444' // red-500 - works well in both light and dark
const incomeColorLight = 'rgba(16, 185, 129, 0.1)' // light fill
const expenseColorLight = 'rgba(239, 68, 68, 0.1)' // light fill

// Get all unique dates and sort them
const allDates = computed(() => {
  const dateSet = new Set<string>()
  props.incomeData.forEach(item => dateSet.add(item.date))
  props.expenseData.forEach(item => dateSet.add(item.date))
  const dates = Array.from(dateSet).sort()
  // If no dates, return empty array (chart will handle empty state)
  return dates
})

// Format date for display (e.g., "Jan 15" or "2024-01-15")
const formatDateLabel = (dateStr: string) => {
  const date = new Date(dateStr)
  const month = date.toLocaleDateString('id-ID', { month: 'short' })
  const day = date.getDate()
  return `${day} ${month}`
}

// Create data arrays aligned to allDates
const incomeChartData = computed(() => {
  const dataMap = new Map(props.incomeData.map(item => [item.date, item.total]))
  return allDates.value.map(date => dataMap.get(date) || 0)
})

const expenseChartData = computed(() => {
  const dataMap = new Map(props.expenseData.map(item => [item.date, item.total]))
  return allDates.value.map(date => dataMap.get(date) || 0)
})

const chartData = computed(() => {
  const labels = allDates.value.length > 0 
    ? allDates.value.map(formatDateLabel)
    : []
  
  return {
    labels,
    datasets: [
      {
        label: 'Income',
        data: incomeChartData.value,
        borderColor: incomeColor,
        backgroundColor: incomeColorLight,
        borderWidth: 3,
        pointBackgroundColor: incomeColor,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Expense',
        data: expenseChartData.value,
        borderColor: expenseColor,
        backgroundColor: expenseColorLight,
        borderWidth: 3,
        pointBackgroundColor: expenseColor,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
        fill: true,
        tension: 0.4,
      },
    ],
  }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'top' as const,
      labels: {
        usePointStyle: true,
        padding: 15,
        font: {
          size: 12,
          weight: '500' as const,
        },
        // Color will adapt based on Chart.js defaults which work well in both modes
      },
    },
    tooltip: {
      callbacks: {
        label: (context: any) => {
          const value = context.parsed.y
          if (value === null || value === undefined) return ''
          return `${context.dataset.label}: ${formatIDR(value)}`
        },
      },
      padding: 12,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      titleColor: '#fff',
      bodyColor: '#fff',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 1,
      cornerRadius: 8,
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        callback: (value: string | number) => {
          const numValue = typeof value === 'string' ? parseFloat(value) : value
          return formatIDR(numValue)
        },
        color: 'rgb(100, 116, 139)', // slate-500
        font: {
          size: 11,
        },
      },
      grid: {
        color: 'rgba(148, 163, 184, 0.1)',
        drawBorder: false,
      },
    },
    x: {
      ticks: {
        color: 'rgb(100, 116, 139)', // slate-500
        font: {
          size: 11,
        },
        maxRotation: 45,
        minRotation: 45,
      },
      grid: {
        display: false,
      },
    },
  },
  animation: {
    duration: 600,
    easing: 'easeOutQuart' as const,
  },
}))
</script>

<template>
  <div class="h-64">
    <Line :data="chartData" :options="chartOptions" />
  </div>
</template>

