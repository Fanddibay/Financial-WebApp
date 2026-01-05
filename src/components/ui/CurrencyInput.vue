<script setup lang="ts">
import { ref, watch } from 'vue'
import { parseIDR, formatIDRInput } from '@/utils/currency'

interface Props {
  label?: string
  error?: string
  modelValue: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const displayValue = ref(formatIDRInput(props.modelValue))

// Watch for external changes to modelValue
watch(() => props.modelValue, (newValue) => {
  const formatted = formatIDRInput(newValue)
  if (displayValue.value !== formatted) {
    displayValue.value = formatted
  }
})

function handleInput(e: Event) {
  const target = e.target as HTMLInputElement
  let value = target.value

  // Remove non-digit characters except comma
  value = value.replace(/[^\d,]/g, '')

  // Replace comma with nothing for parsing (Indonesian format uses comma for thousands)
  const numericValue = parseIDR(value)

  // Format the display value
  displayValue.value = formatIDRInput(numericValue)

  // Emit the numeric value
  emit('update:modelValue', numericValue)
}

function handleBlur() {
  // Ensure display is properly formatted on blur
  displayValue.value = formatIDRInput(props.modelValue)
}

function handleFocus(e: Event) {
  // Select all text on focus for easy editing
  const target = e.target as HTMLInputElement
  target.select()
}
</script>

<template>
  <div class="space-y-1.5">
    <label v-if="label" class="block text-sm font-medium text-slate-700 dark:text-slate-300">
      {{ label }}
    </label>
    <div class="relative">
      <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400">Rp</span>
      <input :value="displayValue" type="text" inputmode="numeric"
        class="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 pl-12 text-slate-900 transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
        :class="{ 'border-red-500 focus:border-red-500 focus:ring-red-500/20': error }" @input="handleInput"
        @blur="handleBlur" @focus="handleFocus" />
    </div>
    <p v-if="error" class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
  </div>
</template>
