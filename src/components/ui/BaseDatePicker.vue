<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

interface Props {
  modelValue: string // ISO date string (YYYY-MM-DD)
  label?: string
  error?: string
  minDate?: string
  maxDate?: string
}

const props = withDefaults(defineProps<Props>(), {
  label: '',
  error: '',
  minDate: undefined,
  maxDate: undefined,
})

// Get today's date in YYYY-MM-DD format
function getTodayDateString(): string {
  const dateStr = new Date().toISOString().split('T')[0]
  return dateStr || new Date().toLocaleDateString('en-CA') // Fallback to YYYY-MM-DD format
}

// Computed property to get effective maxDate (defaults to today if not provided)
const effectiveMaxDate = computed(() => {
  return props.maxDate || getTodayDateString()
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const isOpen = ref(false)
const currentMonth = ref(new Date())
const selectedDate = computed(() => (props.modelValue ? new Date(props.modelValue) : null))
const viewMode = ref<'calendar' | 'month' | 'year'>('calendar')
const yearPickerStart = ref(0)

// Format date for display
const displayValue = computed(() => {
  if (!props.modelValue) return ''
  const date = new Date(props.modelValue)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
})

// Calendar calculations
const year = computed(() => currentMonth.value.getFullYear())
const month = computed(() => currentMonth.value.getMonth())

const monthName = computed(() => {
  return currentMonth.value.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
})

const daysInMonth = computed(() => {
  return new Date(year.value, month.value + 1, 0).getDate()
})

const firstDayOfMonth = computed(() => {
  return new Date(year.value, month.value, 1).getDay()
})

const calendarDays = computed(() => {
  const days: (Date | null)[] = []

  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDayOfMonth.value; i++) {
    days.push(null)
  }

  // Add all days of the month
  for (let day = 1; day <= daysInMonth.value; day++) {
    days.push(new Date(year.value, month.value, day))
  }

  return days
})

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

// Year picker calculations
const currentYear = computed(() => year.value)
const yearRange = computed(() => {
  const years: number[] = []
  for (let i = 0; i < 20; i++) {
    years.push(yearPickerStart.value + i)
  }
  return years
})

function previousMonth() {
  currentMonth.value = new Date(year.value, month.value - 1, 1)
}

function nextMonth() {
  currentMonth.value = new Date(year.value, month.value + 1, 1)
}

function goToToday() {
  currentMonth.value = new Date()
  selectDate(new Date())
}

function selectDate(date: Date | null) {
  if (!date) return

  // Check min/max constraints (compare date parts only, not time)
  if (props.minDate) {
    const minDate = new Date(props.minDate)
    minDate.setHours(0, 0, 0, 0)
    const compareDate = new Date(date)
    compareDate.setHours(0, 0, 0, 0)
    if (compareDate < minDate) return
  }
  // Use effectiveMaxDate which defaults to today
  const maxDate = new Date(effectiveMaxDate.value)
  maxDate.setHours(23, 59, 59, 999)
  const compareDate = new Date(date)
  compareDate.setHours(23, 59, 59, 999)
  if (compareDate > maxDate) return

  const dateStr = date?.toISOString().split('T')[0] ?? ''
  emit('update:modelValue', dateStr)
  isOpen.value = false
}

function isSelected(date: Date | null): boolean {
  if (!date || !selectedDate.value) return false
  return (
    date.getDate() === selectedDate.value.getDate() &&
    date.getMonth() === selectedDate.value.getMonth() &&
    date.getFullYear() === selectedDate.value.getFullYear()
  )
}

function isToday(date: Date | null): boolean {
  if (!date) return false
  const today = new Date()
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

function isDisabled(date: Date | null): boolean {
  if (!date) return true
  
  // Compare date parts only, not time
  if (props.minDate) {
    const minDate = new Date(props.minDate)
    minDate.setHours(0, 0, 0, 0)
    const compareDate = new Date(date)
    compareDate.setHours(0, 0, 0, 0)
    if (compareDate < minDate) return true
  }
  // Use effectiveMaxDate which defaults to today
  const maxDate = new Date(effectiveMaxDate.value)
  maxDate.setHours(23, 59, 59, 999)
  const compareDate = new Date(date)
  compareDate.setHours(23, 59, 59, 999)
  if (compareDate > maxDate) return true
  return false
}

// Sync current month with selected date
watch(() => props.modelValue, (newValue) => {
  if (newValue && !isOpen.value) {
    currentMonth.value = new Date(newValue)
  }
})

function toggleCalendar() {
  isOpen.value = !isOpen.value
  viewMode.value = 'calendar'
  if (isOpen.value) {
    if (props.modelValue) {
      currentMonth.value = new Date(props.modelValue)
    }
    yearPickerStart.value = Math.floor(currentYear.value / 10) * 10 - 10
  }
}

function showMonthPicker() {
  viewMode.value = 'month'
}

function showYearPicker() {
  viewMode.value = 'year'
  yearPickerStart.value = Math.floor(currentYear.value / 10) * 10 - 10
}

function selectMonth(monthIndex: number) {
  currentMonth.value = new Date(year.value, monthIndex, 1)
  viewMode.value = 'calendar'
}

function selectYear(selectedYear: number) {
  currentMonth.value = new Date(selectedYear, month.value, 1)
  viewMode.value = 'month'
}

function previousYearRange() {
  yearPickerStart.value -= 20
}

function nextYearRange() {
  yearPickerStart.value += 20
}

function isCurrentMonth(monthIndex: number): boolean {
  const today = new Date()
  return monthIndex === today.getMonth() && year.value === today.getFullYear()
}

function isCurrentYear(yr: number): boolean {
  return yr === new Date().getFullYear()
}

function isSelectedMonth(monthIndex: number): boolean {
  if (!selectedDate.value) return false
  return monthIndex === selectedDate.value.getMonth() && year.value === selectedDate.value.getFullYear()
}

function isSelectedYear(yr: number): boolean {
  if (!selectedDate.value) return false
  return yr === selectedDate.value.getFullYear()
}

function handleOutsideClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (!target.closest('.datepicker-container')) {
    isOpen.value = false
  }
}

// Close on escape key
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && isOpen.value) {
    isOpen.value = false
  }
}
</script>

<template>
  <div class="datepicker-container relative space-y-1.5">
    <label v-if="label" class="block text-sm font-medium text-slate-700 dark:text-slate-300">
      {{ label }}
    </label>

    <!-- Input Field -->
    <div class="relative">
      <input :value="displayValue" readonly @click="toggleCalendar" @keydown.enter="toggleCalendar" :class="[
        'w-full cursor-pointer rounded-lg border border-slate-300 bg-white px-4 py-2 pr-10 text-slate-900 transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100',
        error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : '',
      ]" placeholder="Select date" />
      <button type="button" @click="toggleCalendar"
        class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300">
        <font-awesome-icon :icon="['fas', 'calendar']" />
      </button>
    </div>

    <!-- Calendar Popup -->
    <Teleport to="body">
      <Transition enter-active-class="transition-opacity duration-200" enter-from-class="opacity-0"
        enter-to-class="opacity-100" leave-active-class="transition-opacity duration-200" leave-from-class="opacity-100"
        leave-to-class="opacity-0">
        <div v-if="isOpen" class="fixed inset-0 z-50" @click="handleOutsideClick" @keydown="handleKeydown">
          <div
            class="absolute left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800"
            style="width: min(90vw, 320px); max-height: 90vh;" @click.stop>
            <!-- Calendar Header -->
            <div class="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
              <button v-if="viewMode === 'calendar'" type="button" @click="previousMonth"
                class="flex h-8 w-8 items-center justify-center rounded-lg text-brand transition hover:bg-brand/10 dark:text-brand dark:hover:bg-brand/20">
                <font-awesome-icon :icon="['fas', 'chevron-left']" class="h-4 w-4" />
              </button>
              <button v-else-if="viewMode === 'month'" type="button" @click="viewMode = 'calendar'"
                class="flex h-8 w-8 items-center justify-center rounded-lg text-brand transition hover:bg-brand/10 dark:text-brand dark:hover:bg-brand/20">
                <font-awesome-icon :icon="['fas', 'chevron-left']" class="h-4 w-4" />
              </button>
              <button v-else type="button" @click="previousYearRange"
                class="flex h-8 w-8 items-center justify-center rounded-lg text-brand transition hover:bg-brand/10 dark:text-brand dark:hover:bg-brand/20">
                <font-awesome-icon :icon="['fas', 'chevron-left']" class="h-4 w-4" />
              </button>

              <div class="flex items-center gap-2">
                <!-- Calendar View -->
                <div v-if="viewMode === 'calendar'" class="flex items-center gap-2">
                  <button type="button" @click="showMonthPicker"
                    class="font-semibold text-slate-900 transition hover:text-brand dark:text-slate-100">
                    {{ monthName }}
                  </button>
                  <button type="button" @click="goToToday"
                    class="rounded-lg px-2 py-1 text-xs text-brand hover:bg-brand/10 dark:hover:bg-brand/20">
                    Today
                  </button>
                </div>

                <!-- Month View -->
                <div v-else-if="viewMode === 'month'" class="flex items-center gap-2">
                  <button type="button" @click="showYearPicker"
                    class="font-semibold text-slate-900 transition hover:text-brand dark:text-slate-100">
                    {{ year }}
                  </button>
                </div>

                <!-- Year View -->
                <div v-else class="flex items-center gap-2">
                  <h3 class="font-semibold text-slate-900 dark:text-slate-100">
                    {{ yearPickerStart }} - {{ yearPickerStart + 19 }}
                  </h3>
                </div>
              </div>

              <button v-if="viewMode === 'calendar'" type="button" @click="nextMonth"
                class="flex h-8 w-8 items-center justify-center rounded-lg text-brand transition hover:bg-brand/10 dark:text-brand dark:hover:bg-brand/20">
                <font-awesome-icon :icon="['fas', 'chevron-right']" class="h-4 w-4" />
              </button>
              <button v-else-if="viewMode === 'month'" type="button" @click="viewMode = 'calendar'"
                class="flex h-8 w-8 items-center justify-center rounded-lg text-brand transition hover:bg-brand/10 dark:text-brand dark:hover:bg-brand/20 opacity-0 pointer-events-none">
                <font-awesome-icon :icon="['fas', 'chevron-right']" class="h-4 w-4" />
              </button>
              <button v-else type="button" @click="nextYearRange"
                class="flex h-8 w-8 items-center justify-center rounded-lg text-brand transition hover:bg-brand/10 dark:text-brand dark:hover:bg-brand/20">
                <font-awesome-icon :icon="['fas', 'chevron-right']" class="h-4 w-4" />
              </button>
            </div>

            <!-- Calendar View -->
            <div v-if="viewMode === 'calendar'">
              <!-- Week Days Header -->
              <div class="grid grid-cols-7 gap-1 border-b border-slate-200 px-2 py-2 dark:border-slate-700">
                <div v-for="day in weekDays" :key="day"
                  class="text-center text-xs font-medium text-slate-500 dark:text-slate-400">
                  {{ day }}
                </div>
              </div>

              <!-- Calendar Days -->
              <div class="grid grid-cols-7 gap-1 p-2">
                <button v-for="(date, index) in calendarDays" :key="index" type="button" @click="selectDate(date)"
                  :disabled="isDisabled(date)" :class="[
                    'flex h-9 items-center justify-center rounded-lg text-sm transition',
                    date
                      ? isSelected(date)
                        ? 'bg-brand text-white'
                        : isToday(date)
                          ? 'bg-slate-100 font-semibold text-slate-900 dark:bg-slate-700 dark:text-slate-100'
                          : isDisabled(date)
                            ? 'cursor-not-allowed text-slate-300 dark:text-slate-600'
                            : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
                      : 'cursor-default',
                  ]">
                  {{ date ? date.getDate() : '' }}
                </button>
              </div>
            </div>

            <!-- Month Picker View -->
            <div v-else-if="viewMode === 'month'" class="grid grid-cols-3 gap-2 p-4">
              <button v-for="(monthName, monthIndex) in monthNames" :key="monthIndex" type="button"
                @click="selectMonth(monthIndex)" :class="[
                  'rounded-lg px-3 py-2 text-sm font-medium transition',
                  isSelectedMonth(monthIndex)
                    ? 'bg-brand text-white'
                    : isCurrentMonth(monthIndex)
                      ? 'bg-slate-100 font-semibold text-slate-900 dark:bg-slate-700 dark:text-slate-100'
                      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700',
                ]">
                {{ monthName }}
              </button>
            </div>

            <!-- Year Picker View -->
            <div v-else class="grid grid-cols-4 gap-2 p-4 max-h-64 overflow-y-auto">
              <button v-for="yr in yearRange" :key="yr" type="button" @click="selectYear(yr)" :class="[
                'rounded-lg px-3 py-2 text-sm font-medium transition',
                isSelectedYear(yr)
                  ? 'bg-brand text-white'
                  : isCurrentYear(yr)
                    ? 'bg-slate-100 font-semibold text-slate-900 dark:bg-slate-700 dark:text-slate-100'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700',
              ]">
                {{ yr }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <p v-if="error" class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
  </div>
</template>
