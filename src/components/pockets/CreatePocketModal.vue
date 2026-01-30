<script setup lang="ts">
import { ref, computed } from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import IconPicker from '@/components/pockets/IconPicker.vue'
import PocketColorPicker from '@/components/pockets/PocketColorPicker.vue'
import { POCKET_TYPE_OPTIONS } from '@/utils/pocketIcons'
import { DEFAULT_POCKET_COLOR, isDarkColor } from '@/utils/pocketColors'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

interface Props {
  isOpen: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  close: []
  created: [data: { name: string; icon: string; type: 'spending' | 'saving'; color?: string }]
}>()

const name = ref('')
const icon = ref('💰')
const type = ref<'spending' | 'saving'>('spending')
const color = ref(DEFAULT_POCKET_COLOR)
const error = ref('')

const typeOptions = computed(() =>
  POCKET_TYPE_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey) })),
)

const previewStyle = computed(() => ({
  backgroundColor: color.value,
  borderColor: color.value,
}))

const darkPreview = computed(() => isDarkColor(color.value))

function reset() {
  name.value = ''
  icon.value = '💰'
  type.value = 'spending'
  color.value = DEFAULT_POCKET_COLOR
  error.value = ''
}

function handleClose() {
  reset()
  emit('close')
}

function submit() {
  const trimmed = name.value.trim()
  if (!trimmed) {
    error.value = t('pocket.pocketNameRequired')
    return
  }
  error.value = ''
  emit('created', { name: trimmed, icon: icon.value, type: type.value, color: color.value })
  reset()
  emit('close')
}
</script>

<template>
  <BaseModal :is-open="isOpen" :title="t('pocket.createTitle')" size="md" @close="handleClose">
    <p class="mb-4 text-sm text-slate-600 dark:text-slate-400">
      {{ t('pocket.createDesc') }}
    </p>
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
      <BaseSelect v-model="type" :label="t('pocket.pocketType')" :options="typeOptions" />
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
          {{ t('pocket.createPocket') }}
        </BaseButton>
      </div>
    </template>
  </BaseModal>
</template>
