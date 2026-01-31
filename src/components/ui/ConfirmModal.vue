<script setup lang="ts">
import BottomSheet from './BottomSheet.vue'
import BaseButton from './BaseButton.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

interface Props {
  isOpen: boolean
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
  icon?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Konfirmasi',
  confirmText: 'Konfirmasi',
  cancelText: 'Batal',
  variant: 'danger',
  icon: () => ['fas', 'exclamation-triangle'],
})

const emit = defineEmits<{
  confirm: []
  cancel: []
  close: []
}>()

function handleConfirm() {
  emit('confirm')
  emit('close')
}

function handleCancel() {
  emit('cancel')
  emit('close')
}

const iconColors = {
  danger: 'text-red-500',
  warning: 'text-amber-500',
  info: 'text-blue-500',
}

const bgColors = {
  danger: 'bg-red-50 dark:bg-red-900/20',
  warning: 'bg-amber-50 dark:bg-amber-900/20',
  info: 'bg-blue-50 dark:bg-blue-900/20',
}
</script>

<template>
  <BottomSheet :is-open="isOpen" :title="title" max-height="60" @close="handleCancel">
    <div class="text-center">
      <div :class="['mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full', bgColors[variant]]">
        <FontAwesomeIcon :icon="icon" :class="['h-7 w-7', iconColors[variant]]" />
      </div>
      <p class="mb-6 text-sm text-slate-600 dark:text-slate-400">
        {{ message }}
      </p>
    </div>
    <template #footer>
      <div class="flex gap-3">
        <BaseButton variant="secondary" class="flex-1" @click="handleCancel">
          {{ cancelText }}
        </BaseButton>
        <BaseButton :variant="variant === 'danger' ? 'danger' : 'primary'" class="flex-1" @click="handleConfirm">
          {{ confirmText }}
        </BaseButton>
      </div>
    </template>
  </BottomSheet>
</template>
