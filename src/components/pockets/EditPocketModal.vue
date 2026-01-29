<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Pocket } from '@/types/pocket'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import IconPicker from '@/components/pockets/IconPicker.vue'
import PocketColorPicker from '@/components/pockets/PocketColorPicker.vue'
import { DEFAULT_POCKET_COLOR, isDarkColor } from '@/utils/pocketColors'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

interface Props {
  isOpen: boolean
  pocket: Pocket | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  saved: [data: { name: string; icon: string; color: string }]
}>()

const name = ref('')
const icon = ref('💰')
const color = ref(DEFAULT_POCKET_COLOR)
const error = ref('')

watch(
  () => [props.isOpen, props.pocket] as const,
  ([open, p]) => {
    if (open && p) {
      name.value = p.name
      icon.value = p.icon || '💰'
      color.value = p.color || DEFAULT_POCKET_COLOR
      error.value = ''
    }
  },
  { immediate: true },
)

const previewStyle = computed(() => ({
  backgroundColor: color.value,
  borderColor: color.value,
}))

const darkPreview = computed(() => isDarkColor(color.value))

function submit() {
  const trimmed = name.value.trim()
  if (!trimmed) {
    error.value = t('pocket.pocketNameRequired')
    return
  }
  error.value = ''
  emit('saved', { name: trimmed, icon: icon.value, color: color.value })
  emit('close')
}

function handleClose() {
  error.value = ''
  emit('close')
}
</script>

<template>
  <BaseModal :is-open="isOpen" :title="t('pocket.editTitle')" size="md" @close="handleClose">
    <div class="space-y-4">
      <BaseInput
        v-model="name"
        :label="t('pocket.pocketName')"
        :placeholder="t('pocket.pocketNamePlaceholder')"
        :error="error"
      />
      <div>
        <label class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
          {{ t('pocket.icon') }}
        </label>
        <IconPicker v-model="icon" />
      </div>
      <PocketColorPicker v-model="color" />
      <div>
        <p class="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          {{ t('pocket.preview') }}
        </p>
        <div
          class="flex items-center gap-3 rounded-xl border-2 p-3"
          :style="previewStyle"
        >
          <div
            class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl shadow-sm"
            :class="darkPreview ? 'bg-white/20' : 'bg-white/80'"
          >
            {{ icon }}
          </div>
          <p
            class="truncate font-semibold"
            :class="darkPreview ? 'text-white' : 'text-slate-900'"
          >
            {{ name || t('pocket.pocketNamePlaceholder') }}
          </p>
        </div>
      </div>
    </div>
    <template #footer>
      <div class="flex justify-end gap-2">
        <BaseButton variant="secondary" @click="handleClose">
          {{ t('common.cancel') }}
        </BaseButton>
        <BaseButton @click="submit">
          {{ t('common.save') }}
        </BaseButton>
      </div>
    </template>
  </BaseModal>
</template>
