<script setup lang="ts">
import { computed } from 'vue'
import BaseModal from './BaseModal.vue'
import BaseButton from './BaseButton.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

interface Props {
  isOpen: boolean
  title?: string
  message: string
  variant?: 'error' | 'warning' | 'info' | 'success'
  icon?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Pemberitahuan',
  variant: 'error',
  icon: undefined,
})

// Default icons for each variant
const defaultIcons = {
  error: ['fas', 'exclamation-circle'],
  warning: ['fas', 'exclamation-triangle'],
  info: ['fas', 'circle-info'],
  success: ['fas', 'check-circle'],
} as const

// Computed property to get the icon to use (props.icon or default based on variant)
const iconToUse = computed(() => {
  if (props.icon) {
    return props.icon
  }
  return defaultIcons[props.variant]
})

const emit = defineEmits<{
  close: []
}>()

function handleClose() {
  emit('close')
}

const iconColors = {
  error: 'text-red-500',
  warning: 'text-amber-500',
  info: 'text-blue-500',
  success: 'text-green-500',
}

const bgColors = {
  error: 'bg-red-50 dark:bg-red-900/20',
  warning: 'bg-amber-50 dark:bg-amber-900/20',
  info: 'bg-blue-50 dark:bg-blue-900/20',
  success: 'bg-green-50 dark:bg-green-900/20',
}

const buttonVariants = {
  error: 'danger',
  warning: 'primary',
  info: 'primary',
  success: 'primary',
} as const
</script>

<template>
  <BaseModal :is-open="isOpen" size="sm" @close="handleClose">
    <div class="text-center">
      <div :class="['mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full', bgColors[variant]]">
        <FontAwesomeIcon :icon="iconToUse" :class="['text-3xl', iconColors[variant]]" />
      </div>
      <h3 class="mb-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
        {{ title }}
      </h3>
      <p class="mb-6 text-sm text-slate-600 dark:text-slate-400">
        {{ message }}
      </p>
    </div>
    <template #footer>
      <div class="flex justify-end">
        <BaseButton :variant="buttonVariants[variant]" class="min-w-[100px]" @click="handleClose">
          OK
        </BaseButton>
      </div>
    </template>
  </BaseModal>
</template>

