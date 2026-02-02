<script setup lang="ts">
import BottomSheet from '@/components/ui/BottomSheet.vue'
import { useI18n } from 'vue-i18n'
import { onMounted, onUnmounted, ref } from 'vue'
import guideVideo from '@/assets/exportImport.MP4'

defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useI18n()

const isOnline = ref(navigator.onLine)
function updateOnlineStatus() {
  isOnline.value = navigator.onLine
}

onMounted(() => {
  window.addEventListener('online', updateOnlineStatus)
  window.addEventListener('offline', updateOnlineStatus)
})

onUnmounted(() => {
  window.removeEventListener('online', updateOnlineStatus)
  window.removeEventListener('offline', updateOnlineStatus)
})
</script>

<template>
  <BottomSheet :is-open="isOpen" :title="t('dataManagement.guideTitle')" max-height="70" @close="emit('close')">
    <div class="space-y-4">
      <!-- Video: container dengan aspect ratio proper agar video tidak ketutup -->
      <div class="aspect-video min-h-[220px] w-full overflow-hidden rounded-xl bg-slate-900 relative">
        <video v-if="isOnline" :src="guideVideo" class="h-full w-full object-contain" controls playsinline muted
          autoplay />
        <div v-else
          class="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-white bg-slate-800">
          <font-awesome-icon :icon="['fas', 'exclamation-triangle']" class="mb-3 h-10 w-10 text-slate-500" />
          <p class="text-sm font-medium">{{ t('dataManagement.offlineTutorialTitle') }}</p>
          <p class="mt-1 text-xs text-slate-400">{{ t('dataManagement.offlineTutorialDesc') }}</p>
        </div>
      </div>

      <!-- Supporting copy -->
      <div class="space-y-3 text-sm text-slate-600 dark:text-slate-400">
        <div class="flex gap-2">
          <span class="mt-0.5 shrink-0 text-brand" aria-hidden="true">•</span>
          <p>{{ t('dataManagement.guidePoint1') }}</p>
        </div>
        <div class="flex gap-2">
          <span class="mt-0.5 shrink-0 text-brand" aria-hidden="true">•</span>
          <p>{{ t('dataManagement.guidePoint2') }}</p>
        </div>
        <div class="flex gap-2">
          <span class="mt-0.5 shrink-0 text-brand" aria-hidden="true">•</span>
          <p>{{ t('dataManagement.guidePoint3') }}</p>
        </div>
      </div>
    </div>
  </BottomSheet>
</template>
