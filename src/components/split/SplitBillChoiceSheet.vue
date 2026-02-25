<script setup lang="ts">
import { ref, watch } from 'vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useI18n } from 'vue-i18n'

const emit = defineEmits<{
  close: []
  manual: []
  takePhoto: []
  upload: []
}>()

const props = defineProps<{ isOpen: boolean }>()
const { t } = useI18n()
const step = ref<'main' | 'camera'>('main')

watch(
  () => props.isOpen,
  (open) => {
    if (open) step.value = 'main'
  },
)

function goToCamera() {
  step.value = 'camera'
}

function goBack() {
  step.value = 'main'
}

function handleManual() {
  emit('manual')
  emit('close')
}

function handleTakePhoto() {
  emit('takePhoto')
  emit('close')
}

function handleUpload() {
  emit('upload')
  emit('close')
}
</script>

<template>
  <BottomSheet
    :is-open="isOpen"
    :title="step === 'camera' ? t('split.byCameraTitle') : t('split.entryTitle')"
    :subtitle="step === 'camera' ? t('split.byCameraSubtitle') : undefined"
    max-height="60"
    @close="emit('close')"
  >
    <div class="space-y-3 pb-4">
      <!-- Main: Manual | By Camera -->
      <template v-if="step === 'main'">
        <button
          type="button"
          class="flex w-full items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-brand/40 hover:bg-brand/5 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-brand/40"
          @click="handleManual"
        >
          <span
            class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
          >
            <font-awesome-icon :icon="['fas', 'keyboard']" class="h-6 w-6" />
          </span>
          <div class="min-w-0 flex-1">
            <p class="font-semibold text-slate-900 dark:text-slate-100">
              {{ t('split.manualOption') }}
            </p>
            <p class="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {{ t('split.manualOptionDesc') }}
            </p>
          </div>
          <font-awesome-icon :icon="['fas', 'chevron-right']" class="h-5 w-5 shrink-0 text-slate-400" />
        </button>
        <button
          type="button"
          class="flex w-full items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-brand/40 hover:bg-brand/5 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-brand/40"
          @click="goToCamera"
        >
          <span
            class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
          >
            <font-awesome-icon :icon="['fas', 'camera']" class="h-6 w-6" />
          </span>
          <div class="min-w-0 flex-1">
            <p class="font-semibold text-slate-900 dark:text-slate-100">
              {{ t('split.scanReceiptOption') }}
            </p>
            <p class="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {{ t('split.scanReceiptOptionDesc') }}
            </p>
          </div>
          <font-awesome-icon :icon="['fas', 'chevron-right']" class="h-5 w-5 shrink-0 text-slate-400" />
        </button>
      </template>

      <!-- Camera sub: Foto langsung | Upload -->
      <template v-else>
        <button
          type="button"
          class="flex items-center gap-3 text-sm font-medium text-slate-600 dark:text-slate-400"
          @click="goBack"
        >
          <font-awesome-icon :icon="['fas', 'chevron-left']" class="h-4 w-4" />
          {{ t('nav.back') }}
        </button>
        <div class="space-y-3 pt-2">
          <button
            type="button"
            class="flex w-full items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-brand/40 hover:bg-brand/5 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-brand/40"
            @click="handleTakePhoto"
          >
            <span
              class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand dark:bg-brand/25"
            >
              <font-awesome-icon :icon="['fas', 'camera']" class="h-6 w-6" />
            </span>
            <div class="min-w-0 flex-1">
              <p class="font-semibold text-slate-900 dark:text-slate-100">
                {{ t('split.takePhotoOption') }}
              </p>
              <p class="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                {{ t('split.takePhotoOptionDesc') }}
              </p>
            </div>
            <font-awesome-icon :icon="['fas', 'chevron-right']" class="h-5 w-5 shrink-0 text-slate-400" />
          </button>
          <button
            type="button"
            class="flex w-full items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-brand/40 hover:bg-brand/5 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-brand/40"
            @click="handleUpload"
          >
            <span
              class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
            >
              <font-awesome-icon :icon="['fas', 'upload']" class="h-6 w-6" />
            </span>
            <div class="min-w-0 flex-1">
              <p class="font-semibold text-slate-900 dark:text-slate-100">
                {{ t('split.uploadOption') }}
              </p>
              <p class="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                {{ t('split.uploadOptionDesc') }}
              </p>
            </div>
            <font-awesome-icon :icon="['fas', 'chevron-right']" class="h-5 w-5 shrink-0 text-slate-400" />
          </button>
        </div>
      </template>
    </div>
  </BottomSheet>
</template>
