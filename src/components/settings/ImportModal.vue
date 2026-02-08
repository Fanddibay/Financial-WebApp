<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useI18n } from 'vue-i18n'

interface Props {
  isOpen: boolean
}

const props = defineProps<Props>()

const { t } = useI18n()

const emit = defineEmits<{
  close: []
  success: [message: string]
  error: [message: string]
  confirm: [file: File, passphrase: string]
}>()

const selectedFile = ref<File | null>(null)
const passphrase = ref('')
const isLoading = ref(false)
const showPassphrase = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)
const errors = ref({
  file: '',
  passphrase: '',
})

function resetForm() {
  selectedFile.value = null
  passphrase.value = ''
  showPassphrase.value = false
  errors.value = { file: '', passphrase: '' }
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  errors.value.file = ''

  if (!file) {
    return
  }

  // Validate file type
  if (!file.type.includes('json') && !file.name.endsWith('.json')) {
    errors.value.file = t('dataManagement.importModal.fileErrorInvalid')
    selectedFile.value = null
    return
  }

  selectedFile.value = file
}

function validate() {
  errors.value = { file: '', passphrase: '' }
  let isValid = true

  if (!selectedFile.value) {
    errors.value.file = t('dataManagement.importModal.fileErrorRequired')
    isValid = false
  }

  if (!passphrase.value || passphrase.value.length < 4) {
    errors.value.passphrase = t('dataManagement.importModal.passphraseTooShort')
    isValid = false
  }

  return isValid
}

function handleImport() {
  if (!validate() || !selectedFile.value) {
    return
  }

  emit('confirm', selectedFile.value, passphrase.value)
}

function handleClose() {
  resetForm()
  emit('close')
}

// Reset when modal is closed (e.g. parent closes after "Lanjutkan" so handleClose is not called)
watch(
  () => props.isOpen,
  (isOpen, wasOpen) => {
    if (wasOpen && !isOpen) resetForm()
  },
)

const fileName = computed(() => {
  return selectedFile.value?.name || t('dataManagement.importModal.noFileSelected')
})
</script>

<template>
  <BottomSheet :is-open="isOpen" :title="t('dataManagement.importModal.title')"
    :subtitle="t('dataManagement.importModal.subtitle')" max-height="70" @close="handleClose">
    <div class="space-y-4">
      <div class="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <div class="flex items-start gap-2">
          <font-awesome-icon :icon="['fas', 'circle-info']" class="mt-0.5 text-blue-600 dark:text-blue-400" />
          <div class="flex-1 text-sm text-blue-800 dark:text-blue-300">
            <p class="font-medium mb-1">{{ t('dataManagement.importModal.infoTitle') }}</p>
            <p>
              {{ t('dataManagement.importModal.infoDesc') }}
            </p>
          </div>
        </div>
      </div>

      <div class="space-y-3">
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            {{ t('dataManagement.importModal.fileLabel') }}
          </label>
          <div class="space-y-2">
            <label
              class="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-3 transition hover:border-brand dark:border-slate-600 dark:bg-slate-700">
              <font-awesome-icon :icon="['fas', 'upload']" class="text-slate-400" />
              <span class="flex-1 text-sm text-slate-700 dark:text-slate-300">
                {{ fileName }}
              </span>
              <span
                class="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 dark:bg-slate-600 dark:text-slate-300">
                {{ t('dataManagement.importModal.chooseFile') }}
              </span>
              <input ref="fileInputRef" type="file" accept=".json,application/json" class="hidden" @change="handleFileSelect" />
            </label>
            <p v-if="errors.file" class="text-sm text-red-600 dark:text-red-400">
              {{ errors.file }}
            </p>
          </div>
        </div>

        <div class="relative sm:space-y-0 -space-y-8">
          <BaseInput v-model="passphrase" :label="t('dataManagement.importModal.passphraseLabel')"
            :type="showPassphrase ? 'text' : 'password'" :error="errors.passphrase"
            :placeholder="t('dataManagement.importModal.passphrasePlaceholder')" />
          <button type="button" @click.stop.prevent="showPassphrase = !showPassphrase"
            class="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors">
            <div class="absolute sm:top-1/2 sm:translate-y-1  right-4 top-1/2 -translate-y-0.5">
              <div class="flex gap-1.5 items-center">
                <font-awesome-icon :icon="['fas', showPassphrase ? 'eye-slash' : 'eye']" class="h-4 w-4" />
                <!-- <span>{{ showPassphrase ? t('common.hide') : t('common.show') }}</span> -->
              </div>
            </div>
          </button>
        </div>
      </div>

      <div class="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <div class="flex items-start gap-2">
          <font-awesome-icon :icon="['fas', 'shield']" class="mt-0.5 text-blue-600 dark:text-blue-400" />
          <div class="flex-1 text-sm text-blue-800 dark:text-blue-300">
            <p class="font-medium mb-1">{{ t('dataManagement.importModal.securityTitle') }}</p>
            <p>
              {{ t('dataManagement.importModal.securityDesc') }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex gap-3">
        <BaseButton variant="secondary" class="flex-1" @click="handleClose" :disabled="isLoading">
          {{ t('common.cancel') }}
        </BaseButton>
        <BaseButton class="flex-1" @click="handleImport" :loading="isLoading">
          <font-awesome-icon :icon="['fas', 'file-import']" class="mr-2" />
          {{ t('dataManagement.importModal.continueButton') }}
        </BaseButton>
      </div>
    </template>
  </BottomSheet>
</template>
