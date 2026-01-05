<script setup lang="ts">
interface Props {
    label?: string
    error?: string
    modelValue: string
    options: Array<{ value: string; label: string }>
}

defineProps<Props>()

const emit = defineEmits<{
    'update:modelValue': [value: string]
}>()

function handleChange(e: Event) {
    const target = e.target as HTMLSelectElement
    emit('update:modelValue', target.value)
}
</script>

<template>
    <div class="space-y-1.5">
        <label v-if="label" class="block text-xs font-medium text-slate-700 dark:text-slate-300">
            {{ label }}
        </label>
        <select :value="modelValue"
            class="w-full rounded-lg border border-slate-300 bg-white py-2 text-xs text-slate-900 transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            :class="{ 'border-red-500 focus:border-red-500 focus:ring-red-500/20': error }" @change="handleChange">
            <option v-for="option in options" :key="option.value" :value="option.value" class="!text-xs">
                {{ option.label }}
            </option>
        </select>
        <p v-if="error" class="text-xs text-red-600 dark:text-red-400">{{ error }}</p>
    </div>
</template>
