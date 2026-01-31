<script setup lang="ts">
import { useRouter } from 'vue-router'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useI18n } from 'vue-i18n'

defineProps<{
  title: string
  subtitle?: string
  showBack?: boolean
}>()

defineSlots<{
  right?(): unknown
}>()

const { t } = useI18n()
const router = useRouter()

function goBack() {
  router.back()
}
</script>

<template>
  <header
    class="fixed left-0 right-0 top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
    <div class="mx-auto flex max-w-[430px] items-center gap-3 px-4 pt-[max(2rem,env(safe-area-inset-top))] pb-4">
      <button v-if="showBack" type="button"
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        :aria-label="t('nav.back')" @click="goBack">
        <font-awesome-icon :icon="['fas', 'chevron-left']" class="h-5 w-5" />
      </button>
      <div class="min-w-0 flex-1">
        <h1 class="truncate text-xl font-bold text-slate-900 dark:text-slate-100">
          {{ title }}
        </h1>
        <p v-if="subtitle" class="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">
          {{ subtitle }}
        </p>
      </div>
      <div v-if="$slots.right" class="flex shrink-0 items-center gap-2">
        <slot name="right" />
      </div>
    </div>
  </header>
</template>
