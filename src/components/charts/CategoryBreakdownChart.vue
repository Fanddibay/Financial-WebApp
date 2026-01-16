<script setup lang="ts">
import { computed } from 'vue'
import { Bar, Line, Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { formatIDR } from '@/utils/currency'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend
)

type ChartType = 'bar' | 'line' | 'doughnut'

interface Props {
  transactionsByCategory: Array<{ category: string; total: number; count: number }>
  chartType?: ChartType
}

const props = withDefaults(defineProps<Props>(), {
  chartType: 'bar',
})

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

const chartData = computed(() => {
  const labels = props.transactionsByCategory.map((item) => item.category)
  const data = props.transactionsByCategory.map((item) => item.total)

  if (props.chartType === 'doughnut') {
    return {
      labels,
      datasets: [
        {
          label: 'Amount (IDR)',
          data,
          backgroundColor: colors.slice(0, labels.length),
          borderWidth: 0,
          hoverBorderWidth: 4,
          hoverBorderColor: '#ffffff',
          hoverOffset: 8,
        },
      ],
    }
  }

  return {
    labels,
    datasets: [
      {
        label: 'Amount (IDR)',
        data,
        backgroundColor: props.chartType === 'bar' ? '#10b981' : 'rgba(16, 185, 129, 0.1)',
        borderColor: props.chartType === 'line' ? '#10b981' : undefined,
        borderWidth: props.chartType === 'line' ? 3 : undefined,
        pointBackgroundColor: props.chartType === 'line' ? '#10b981' : undefined,
        pointBorderColor: props.chartType === 'line' ? '#ffffff' : undefined,
        pointBorderWidth: props.chartType === 'line' ? 2 : undefined,
        pointRadius: props.chartType === 'line' ? 5 : undefined,
        pointHoverRadius: props.chartType === 'line' ? 7 : undefined,
        fill: props.chartType === 'line' ? true : undefined,
        borderRadius: props.chartType === 'bar' ? 8 : undefined,
        tension: props.chartType === 'line' ? 0.4 : undefined,
      },
    ],
  }
})

const chartOptions = computed(() => {
  const baseOptions: any = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
        display: props.chartType === 'doughnut',
        position: 'bottom' as const,
        labels: {
          padding: 15,
          usePointStyle: true,
          font: {
            size: 12,
          },
        },
    },
    tooltip: {
      callbacks: {
          label: (context: any) => {
            const value = props.chartType === 'doughnut' 
              ? context.parsed 
              : context.parsed.y
            if (value === null || value === undefined) return ''
            
            const formatted = formatIDR(value)
            if (props.chartType === 'doughnut') {
              const total = props.transactionsByCategory.reduce((sum, item) => sum + item.total, 0)
              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0'
              return `${formatted} (${percentage}%)`
            }
            return formatted
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
    animation: {
      duration: 600,
      easing: 'easeOutQuart' as const,
    },
  }

  if (props.chartType !== 'doughnut') {
    baseOptions.scales = {
    y: {
      beginAtZero: true,
      ticks: {
        callback: (value: string | number) => {
          const numValue = typeof value === 'string' ? parseFloat(value) : value
          return formatIDR(numValue)
        },
      },
        grid: {
          color: 'rgba(148, 163, 184, 0.1)',
        },
      },
      x: {
        grid: {
          display: false,
    },
  },
}
  } else {
    baseOptions.cutout = '60%'
  }

  return baseOptions
})
</script>

<template>
  <div :class="[
    'transition-all duration-300',
    chartType === 'doughnut' ? 'h-80' : 'h-64'
  ]">
    <Bar v-if="chartType === 'bar'" :data="chartData" :options="chartOptions" />
    <Line v-else-if="chartType === 'line'" :data="chartData" :options="chartOptions" />
    <Doughnut v-else-if="chartType === 'doughnut'" :data="chartData" :options="chartOptions" />
  </div>
</template>

