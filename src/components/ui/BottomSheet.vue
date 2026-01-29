<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useI18n } from 'vue-i18n'

interface Props {
  isOpen: boolean
  title?: string
  /** Optional subtitle shown below title */
  subtitle?: string
}

defineProps<Props>()
const { t } = useI18n()

const emit = defineEmits<{
  close: []
}>()

defineSlots<{
  default(): unknown
  headerBottom?(): unknown
  footer?(): unknown
}>()

function handleEscape(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

function handleBackdropClick(e: MouseEvent) {
  if (e.target === e.currentTarget) emit('close')
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
    <Transition
      enter-active-class="transition-opacity duration-250 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex flex-col justify-end bg-black/50"
        @click="handleBackdropClick"
      >
        <Transition
          enter-active-class="transition-transform duration-350 ease-[cubic-bezier(0.32,0.72,0,1)]"
          enter-from-class="translate-y-full"
          enter-to-class="translate-y-0"
          leave-active-class="transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
          leave-from-class="translate-y-0"
          leave-to-class="translate-y-full"
        >
          <div
            v-if="isOpen"
            class="flex max-h-[85vh] flex-col rounded-t-2xl bg-white shadow-xl dark:bg-slate-800"
            @click.stop
          >
            <!-- Handle bar -->
            <div class="flex shrink-0 justify-center pt-3 pb-1">
              <div class="h-1 w-12 rounded-full bg-slate-300 dark:bg-slate-600" />
            </div>

            <!-- Header -->
            <div
              v-if="title || subtitle || $slots.headerBottom"
              class="shrink-0 border-b border-slate-200 px-4 pb-4 pt-0 dark:border-slate-700"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <h2 v-if="title" class="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {{ title }}
                  </h2>
                  <p v-if="subtitle" class="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                    {{ subtitle }}
                  </p>
                </div>
                <button
                  type="button"
                  class="shrink-0 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                  :aria-label="t('common.close')"
                  @click="emit('close')"
                >
                  <font-awesome-icon :icon="['fas', 'times']" class="h-5 w-5" />
                </button>
              </div>
              <div v-if="$slots.headerBottom" class="mt-3">
                <slot name="headerBottom" />
              </div>
            </div>

            <!-- Body -->
            <div class="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              <slot />
            </div>

            <!-- Footer -->
            <div
              v-if="$slots.footer"
              class="shrink-0 border-t border-slate-200 px-4 py-4 dark:border-slate-700"
            >
              <slot name="footer" />
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
