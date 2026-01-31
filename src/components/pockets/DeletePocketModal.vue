<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Pocket } from '@/types/pocket'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

interface Props {
  isOpen: boolean
  pocket: Pocket | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  confirm: []
}>()

const confirmName = ref('')
const error = ref('')

watch(
  () => [props.isOpen, props.pocket?.name] as const,
  ([open]) => {
    if (open) {
      confirmName.value = ''
      error.value = ''
    }
  },
  { immediate: true },
)

const canDelete = computed(() => {
  const p = props.pocket
  return p && confirmName.value.trim() === p.name
})

function handleConfirm() {
  if (!canDelete.value) return
  emit('confirm')
  emit('close')
}

function handleClose() {
  confirmName.value = ''
  error.value = ''
  emit('close')
}
</script>

<template>
  <BottomSheet :is-open="isOpen" :title="t('pocket.deleteTitleConfirm')" max-height="70" @close="handleClose">
    <div class="space-y-4">
      <!-- Warning section -->
      <div
        class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-900/20"
      >
        <p class="text-sm font-medium text-red-800 dark:text-red-300">
          {{ t('pocket.deleteWarning2') }} {{ t('pocket.deleteWarning1') }}
        </p>
      </div>

      <!-- Pocket info section -->
      <div class="rounded-xl bg-slate-100 px-4 py-3 dark:bg-slate-700/50">
        <p class="text-sm text-slate-500 dark:text-slate-400">
          {{ t('pocket.deleteAboutToDelete') }}
        </p>
        <p class="mt-1 font-semibold text-slate-900 dark:text-slate-100">
          {{ pocket?.name ?? '—' }}
        </p>
      </div>

      <!-- Confirmation input section (separate) -->
      <div class="space-y-2">
        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">
          {{ t('pocket.deleteTypeName') }}
        </label>
        <BaseInput
          v-model="confirmName"
          :placeholder="pocket?.name ?? ''"
          :error="error"
          autocomplete="off"
        />
      </div>
    </div>

    <template #footer>
      <div class="flex gap-3">
        <BaseButton variant="secondary" class="flex-1" @click="handleClose">
          {{ t('common.cancel') }}
        </BaseButton>
        <BaseButton
          variant="danger"
          class="flex-1"
          :disabled="!canDelete"
          @click="handleConfirm"
        >
          {{ t('pocket.deleteConfirm') }}
        </BaseButton>
      </div>
    </template>
  </BottomSheet>
</template>
