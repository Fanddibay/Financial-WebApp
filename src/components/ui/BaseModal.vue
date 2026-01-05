<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

interface Props {
  isOpen: boolean
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  size: 'md',
})

const emit = defineEmits<{
  close: []
}>()

defineSlots<{
  default(): unknown
  header?(): unknown
  footer?(): unknown
}>()

function handleEscape(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.isOpen) {
    emit('close')
  }
}

function handleBackdropClick(e: MouseEvent) {
  if (e.target === e.currentTarget) {
    emit('close')
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleEscape)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscape)
})
</script>

<template>
  <Teleport to="body">
    <Transition enter-active-class="transition-opacity duration-200" enter-from-class="opacity-0"
      enter-to-class="opacity-100" leave-active-class="transition-opacity duration-200" leave-from-class="opacity-100"
      leave-to-class="opacity-0">
      <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto"
        @click="handleBackdropClick">
        <Transition enter-active-class="transition-all duration-200" enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100" leave-active-class="transition-all duration-200"
          leave-from-class="opacity-100 scale-100" leave-to-class="opacity-0 scale-95">
          <div v-if="isOpen" :class="[
            'w-full rounded-2xl bg-white shadow-xl dark:bg-slate-800 flex flex-col max-h-[90vh]',
            {
              'max-w-sm': size === 'sm',
              'max-w-md': size === 'md',
              'max-w-lg': size === 'lg',
              'max-w-2xl': size === 'xl',
            },
          ]" @click.stop>
            <div v-if="title || $slots.header"
              class="border-b border-slate-200 px-6 py-4 dark:border-slate-700 flex-shrink-0">
              <slot name="header">
                <h2 v-if="title" class="text-xl font-semibold text-slate-900 dark:text-slate-100">{{ title }}</h2>
              </slot>
            </div>
            <div class="px-6 py-4 overflow-y-auto flex-1 min-h-0" style="padding-bottom: 1.5rem;">
              <slot />
            </div>
            <div v-if="$slots.footer" class="border-t border-slate-200 px-6 py-4 dark:border-slate-700 flex-shrink-0">
              <slot name="footer" />
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
