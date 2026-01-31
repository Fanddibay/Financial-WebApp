<script setup lang="ts">
import BottomSheet from '@/components/ui/BottomSheet.vue'
import { useI18n } from 'vue-i18n'
import guideVideo from '@/assets/exportImport.MP4'

defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useI18n()
</script>

<template>
  <BottomSheet
    :is-open="isOpen"
    :title="t('dataManagement.guideTitle')"
    max-height="70"
    @close="emit('close')"
  >
    <div class="space-y-4">
      <!-- Video: container dengan aspect ratio proper agar video tidak ketutup -->
      <div class="aspect-video min-h-[220px] w-full overflow-hidden rounded-xl bg-slate-900">
        <video
          :src="guideVideo"
          class="h-full w-full object-contain"
          controls
          playsinline
          muted
          autoplay
        />
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
