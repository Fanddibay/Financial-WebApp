<script setup lang="ts">
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { formatIDR } from '@/utils/currency'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

interface Props {
  transactionsByCategory: Array<{ category: string; total: number; count: number }>
}

const props = defineProps<Props>()

const chartData = computed(() => {
  return {
    labels: props.transactionsByCategory.map((item) => item.category),
    datasets: [
      {
        label: 'Amount (IDR)',
        data: props.transactionsByCategory.map((item) => item.total),
        backgroundColor: '#10b981',
        borderRadius: 8,
      },
    ],
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      callbacks: {
        label: (context: { parsed: { y: number | null } }) => {
          if (context.parsed.y === null) return ''
          return formatIDR(context.parsed.y)
        },
      },
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
      },
    },
  },
}
</script>

<template>
  <div class="h-64">
    <Bar :data="chartData" :options="chartOptions" />
  </div>
</template>

