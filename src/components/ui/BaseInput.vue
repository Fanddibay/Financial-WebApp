<script setup lang="ts">
interface Props {
  label?: string
  error?: string
  modelValue: string | number
  type?: string
  placeholder?: string
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  placeholder: '',
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
}>()

function handleInput(e: Event) {
  const target = e.target as HTMLInputElement
  emit('update:modelValue', target.value)
}
</script>

<template>
  <div class="space-y-1.5">
    <label v-if="label" class="block text-sm font-medium text-slate-700 dark:text-slate-300">
      {{ label }}
    </label>
    <input 
      :value="modelValue"
      :type="type"
      :placeholder="placeholder"
      class="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
      :class="{ 'border-red-500 focus:border-red-500 focus:ring-red-500/20': error }" 
      @input="handleInput" 
    />
    <p v-if="error" class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
  </div>
</template>
