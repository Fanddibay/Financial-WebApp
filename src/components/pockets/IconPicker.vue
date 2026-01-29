<script setup lang="ts">
import { POCKET_ICONS } from '@/utils/pocketIcons'

interface Props {
  modelValue: string
}

defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <div class="flex flex-wrap gap-2">
    <button
      v-for="icon in POCKET_ICONS"
      :key="icon"
      type="button"
      :class="[
        'flex h-10 w-10 items-center justify-center rounded-xl text-xl transition',
        modelValue === icon
          ? 'bg-brand text-white ring-2 ring-brand ring-offset-2 dark:ring-offset-slate-800'
          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600',
      ]"
      @click="emit('update:modelValue', icon)"
    >
      {{ icon }}
    </button>
  </div>
</template>
