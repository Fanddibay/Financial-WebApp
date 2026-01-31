<script setup lang="ts">
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
} from 'chart.js'
import type { Transaction } from '@/types/transaction'
import { useI18n } from 'vue-i18n'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip)

interface Props {
  transactions: Transaction[]
}

const props = defineProps<Props>()
const { locale } = useI18n()

// Week starts Monday (0) .. Sunday (6)
const dayLabels = computed(() => {
  const formatter = new Intl.DateTimeFormat(locale.value === 'id' ? 'id-ID' : 'en-US', {
    weekday: 'short',
  })
  const labels: string[] = []
  // Monday = 1 in getDay(); we want Mon first
  const monday = new Date(2024, 0, 1) // Jan 1 2024 is Monday
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(d.getDate() + i)
    labels.push(formatter.format(d))
  }
  return labels
})

function getMondayOfWeek(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function dateToKey(date: Date): string {
  return date.toISOString().split('T')[0]
}

const countsByDay = computed(() => {
  const counts = [0, 0, 0, 0, 0, 0, 0]
  const today = new Date()
  const monday = getMondayOfWeek(today)
  const weekStart = dateToKey(monday)

  props.transactions.forEach((t) => {
    const txDate = t.date.split('T')[0]
    if (txDate < weekStart) return
    const sunday = new Date(monday)
    sunday.setDate(sunday.getDate() + 6)
    const weekEnd = dateToKey(sunday)
    if (txDate > weekEnd) return
    const d = new Date(txDate)
    const dayIndex = (d.getDay() + 6) % 7
    counts[dayIndex] += 1
  })

  return counts
})

const chartData = computed(() => ({
  labels: dayLabels.value,
  datasets: [
    {
      label: '',
      data: countsByDay.value,
      backgroundColor: 'rgba(239, 68, 68, 0.7)',
      borderColor: 'rgb(239, 68, 68)',
      borderWidth: 1,
    },
  ],
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (context: { parsed: { y: number } }) => {
          const v = context.parsed?.y ?? 0
          return `${v} transaction${v !== 1 ? 's' : ''}`
        },
      },
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: { stepSize: 1 },
      grid: { color: 'rgba(148, 163, 184, 0.1)' },
    },
    x: {
      grid: { display: false },
    },
  },
}))
</script>

<template>
  <div class="h-64">
    <Bar :data="chartData" :options="chartOptions" />
  </div>
</template>
