<script setup lang="ts">
import { useRouter } from 'vue-router'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useI18n } from 'vue-i18n'

defineProps<{ isOpen: boolean }>()
const emit = defineEmits<{ close: [] }>()
const { t } = useI18n()
const router = useRouter()

function handleUpgrade() {
  emit('close')
  router.push({ path: '/profile', hash: '#license' })
}

function handleClose() {
  emit('close')
}
</script>

<template>
  <BottomSheet
    :is-open="isOpen"
    :title="t('pocket.disabled.title')"
    @close="emit('close')"
  >
    <div class="flex flex-col items-center gap-4 py-2">
      <div
        class="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:bg-amber-400/20 dark:text-amber-400"
      >
        <font-awesome-icon :icon="['fas', 'wallet']" class="h-7 w-7" />
        <span
          class="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-700 text-white dark:bg-slate-600"
        >
          <font-awesome-icon :icon="['fas', 'lock']" class="h-3 w-3" />
        </span>
      </div>
      <p class="text-center text-sm text-slate-600 dark:text-slate-400">
        {{ t('pocket.disabled.description') }}
      </p>
    </div>

    <template #footer>
      <div class="flex flex-col gap-2">
        <BaseButton class="w-full" size="lg" @click="handleUpgrade">
          {{ t('pocket.disabled.upgrade') }}
        </BaseButton>
        <BaseButton variant="secondary" class="w-full" @click="handleClose">
          {{ t('pocket.disabled.close') }}
        </BaseButton>
      </div>
    </template>
  </BottomSheet>
</template>
