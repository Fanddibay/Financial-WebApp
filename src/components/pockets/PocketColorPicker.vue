<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  POCKET_COLOR_PALETTES,
  DEFAULT_POCKET_COLOR,
  type PaletteKey,
} from '@/utils/pocketColors'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const paletteKeys: PaletteKey[] = ['warm', 'pastel', 'dark']

const paletteLabels: Record<PaletteKey, string> = {
  warm: 'pocket.colorWarm',
  pastel: 'pocket.colorPastel',
  dark: 'pocket.colorDark',
}

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const activeTab = ref<PaletteKey>('warm')

const colors = computed(() => POCKET_COLOR_PALETTES[activeTab.value])

function paletteForColor(hex: string): PaletteKey {
  const h = (hex || '').toLowerCase()
  for (const k of paletteKeys) {
    if (POCKET_COLOR_PALETTES[k].some((c) => c.toLowerCase() === h)) return k
  }
  return 'warm'
}

watch(
  () => props.modelValue,
  (v) => {
    const next = paletteForColor(v || DEFAULT_POCKET_COLOR)
    if (activeTab.value !== next) activeTab.value = next
  },
  { immediate: true },
)

function select(c: string) {
  emit('update:modelValue', c)
}
</script>

<template>
  <div>
    <label class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
      {{ t('pocket.cardColor') }}
    </label>
    <div class="flex flex-col gap-3">
      <div class="flex gap-0.5 rounded-md bg-slate-100 p-0.5 dark:bg-slate-700/50">
        <button v-for="key in paletteKeys" :key="key" type="button" :class="[
          'w-1/2 rounded px-2 py-1.5 text-xs font-medium transition',
          activeTab === key
            ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100'
            : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200',
        ]" @click="activeTab = key">
          {{ t(paletteLabels[key]) }}
        </button>
      </div>
      <div class="flex gap-2 overflow-x-auto pb-1">
        <button v-for="c in colors" :key="c" type="button" :class="[
          'h-9 w-9 shrink-0 rounded-full border-2 transition',
          props.modelValue === c
            ? 'border-slate-900 ring-2 ring-slate-400 ring-offset-2 dark:border-white dark:ring-slate-500 dark:ring-offset-slate-800'
            : 'border-transparent hover:opacity-90',
        ]" :style="{ backgroundColor: c }" :aria-label="`Select ${c}`" @click="select(c)" />
      </div>
    </div>
  </div>
</template>
