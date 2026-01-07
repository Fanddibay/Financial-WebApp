<script setup lang="ts">
import { computed, ref } from 'vue'
import { Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js'
import type { ChartEvent, ActiveElement } from 'chart.js'
import { formatIDR } from '@/utils/currency'

ChartJS.register(ArcElement, Tooltip, Legend)

interface Props {
  transactionsByCategory: Array<{ category: string; total: number; count: number }>
  totalExpenses: number
  label?: string
  isNegative?: boolean
  isExpense?: boolean
  hiddenCategories?: Set<string>
  onSegmentClick?: (category: string) => void
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  label: 'Total Expenses',
  isNegative: false,
  isExpense: false,
  hiddenCategories: () => new Set<string>(),
  onSegmentClick: undefined,
  disabled: false,
})

const hoveredIndex = ref<number | null>(null)

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

const visibleCategories = computed(() => {
  return props.transactionsByCategory.filter(
    (item) => !props.hiddenCategories.has(item.category)
  )
})

const chartData = computed(() => {
  // If disabled and no visible categories, show empty chart with gray color
  if (props.disabled || visibleCategories.value.length === 0) {
    return {
      labels: [''],
      datasets: [
        {
          data: [1], // Single segment for empty state
          backgroundColor: ['#e2e8f0'], // slate-200
          borderWidth: 0,
          hoverBorderWidth: 0,
          hoverOffset: 0,
        },
      ],
    }
  }

  return {
    labels: visibleCategories.value.map((item) => item.category),
    datasets: [
      {
        data: visibleCategories.value.map((item) => item.total),
        backgroundColor: visibleCategories.value.map((item) => {
          const originalIndex = props.transactionsByCategory.findIndex(
            (cat) => cat.category === item.category
          )
          const colorIndex = originalIndex >= 0 ? originalIndex : 0
          return colors[colorIndex % colors.length]
        }),
        borderWidth: 0,
        hoverBorderWidth: 4,
        hoverBorderColor: '#ffffff',
        hoverOffset: 8,
      },
    ],
  }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: true,
  interaction: {
    intersect: false,
    mode: 'nearest' as const,
  },
  onHover: (event: ChartEvent, activeElements: ActiveElement[]) => {
    if (props.disabled) {
      if (event.native && event.native.target instanceof HTMLElement) {
        event.native.target.style.cursor = 'default'
      }
      return
    }
    if (activeElements.length > 0 && activeElements[0]) {
      const index = activeElements[0].index
      hoveredIndex.value = index
      if (event.native && event.native.target instanceof HTMLElement) {
        event.native.target.style.cursor = 'pointer'
      }
    } else {
      hoveredIndex.value = null
      if (event.native && event.native.target instanceof HTMLElement) {
        event.native.target.style.cursor = 'default'
      }
    }
  },
  onClick: (_event: ChartEvent, activeElements: ActiveElement[]) => {
    if (props.disabled || !props.onSegmentClick) {
      return
    }
    if (activeElements.length > 0) {
      const index = activeElements[0]?.index
      if (index !== undefined && index >= 0 && index < visibleCategories.value.length) {
        const category = visibleCategories.value[index]?.category
        if (category) {
          props.onSegmentClick(category)
        }
      }
    }
  },
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      enabled: true,
      callbacks: {
        title: (context: Array<{ label?: string }>) => {
          return context[0]?.label ?? ''
        },
        label: (context: { parsed: number }) => {
          const value = formatIDR(context.parsed)
          const total = visibleCategories.value.reduce((sum, item) => sum + item.total, 0)
          const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : '0'
          return `${value} (${percentage}%)`
        },
      },
      padding: 12,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      titleColor: '#fff',
      bodyColor: '#fff',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 1,
      cornerRadius: 8,
      displayColors: true,
      boxPadding: 6,
    },
  },
  cutout: '75%',
  animation: {
    animateRotate: true,
    animateScale: true,
    duration: 600,
    easing: 'easeOutQuart' as const,
  },
}))

</script>

<template>
  <div class="relative flex items-center justify-center py-4">
    <div class="relative mx-auto" style="width: 280px; height: 280px;">
      <Doughnut :data="chartData" :options="chartOptions" />
      <!-- Centered total inside donut -->
      <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div class="text-center">
          <p :class="[
            'text-xs font-medium mb-1',
            disabled
              ? 'text-slate-400 dark:text-slate-500'
              : 'text-slate-500 dark:text-slate-400'
          ]">{{ label }}</p>
          <p :class="[
            'text-2xl font-bold leading-tight',
            disabled
              ? 'text-slate-400 dark:text-slate-500'
              : isNegative || isExpense
                ? 'text-red-600 dark:text-red-400'
                : 'text-slate-900 dark:text-slate-100'
          ]">
            {{ formatIDR(totalExpenses) }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
