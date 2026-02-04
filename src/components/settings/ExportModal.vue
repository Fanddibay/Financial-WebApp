<script setup lang="ts">
import { ref } from 'vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { exportData } from '@/utils/dataExport'
import { useI18n } from 'vue-i18n'

interface Props {
  isOpen: boolean
}
const { t } = useI18n()

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  success: [message: string]
  error: [message: string]
}>()

const passphrase = ref('')
const confirmPassphrase = ref('')
const isLoading = ref(false)
const showPassphrase = ref(false)
const showConfirmPassphrase = ref(false)
const errors = ref({
  passphrase: '',
  confirmPassphrase: '',
})

function validate() {
  errors.value = { passphrase: '', confirmPassphrase: '' }
  let isValid = true

  if (!passphrase.value || passphrase.value.length < 4) {
    errors.value.passphrase = t('dataManagement.exportModal.passphraseTooShort')
    isValid = false
  }

  if (passphrase.value !== confirmPassphrase.value) {
    errors.value.confirmPassphrase = t('dataManagement.exportModal.passphraseMismatch')
    isValid = false
  }

  return isValid
}

async function handleExport() {
  if (!validate()) {
    return
  }

  isLoading.value = true
  try {
    await exportData(passphrase.value)
    emit('success', t('dataManagement.exportModal.successMessage'))
    handleClose()
  } catch (error) {
    emit(
      'error',
      error instanceof Error ? error.message : t('dataManagement.exportModal.exportFailed'),
    )
  } finally {
    isLoading.value = false
  }
}

function handleClose() {
  passphrase.value = ''
  confirmPassphrase.value = ''
  errors.value = { passphrase: '', confirmPassphrase: '' }
  emit('close')
}
</script>

<template>
  <BottomSheet :is-open="isOpen" :title="t('dataManagement.exportModal.title')"
    :subtitle="t('dataManagement.exportModal.subtitle')" max-height="70"
    @close="handleClose">
    <div class="-space-y-4">
      <div class="rounded-lg bg-blue-50 p-3 mb-8 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <div class="flex items-start gap-2">
          <font-awesome-icon :icon="['fas', 'circle-info']" class="mt-0.5 text-blue-600 dark:text-blue-400" />
          <div class="flex-1 text-sm text-blue-800 dark:text-blue-300">
            <p class="font-medium mb-1">{{ t('dataManagement.exportModal.safeTitle') }}</p>
            <p>{{ t('dataManagement.exportModal.safeDesc') }}</p>
          </div>
        </div>
      </div>

      <div class="-space-y-6">
        <div class="relative">
          <BaseInput v-model="passphrase" :label="t('dataManagement.exportModal.passphraseLabel')"
            :type="showPassphrase ? 'text' : 'password'" :error="errors.passphrase"
            :placeholder="t('dataManagement.exportModal.passphrasePlaceholder')" />
          <button type="button" @click.stop.prevent="showPassphrase = !showPassphrase"
            class="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors">
            <div class="absolute  right-4 top-1/2 -translate-y-[105%]">
              <div class="flex gap-1.5 items-center">
                <font-awesome-icon :icon="['fas', showPassphrase ? 'eye-slash' : 'eye']" class="h-4 w-4" />
                <span>{{ showPassphrase ? t('common.hide') : t('common.show') }}</span>
              </div>
            </div>
          </button>
        </div>

        <div class="relative">
          <BaseInput v-model="confirmPassphrase" :label="t('dataManagement.exportModal.confirmPassphraseLabel')"
            :type="showConfirmPassphrase ? 'text' : 'password'" :error="errors.confirmPassphrase"
            :placeholder="t('dataManagement.exportModal.confirmPassphrasePlaceholder')" />
          <button type="button" @click.stop.prevent="showConfirmPassphrase = !showConfirmPassphrase"
            class="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors">
            <div class="absolute  right-4 top-1/2 -translate-y-[105%]">
              <div class="flex gap-1.5 items-center">
                <font-awesome-icon :icon="['fas', showConfirmPassphrase ? 'eye-slash' : 'eye']" class="h-4 w-4" />
                <span>{{ showConfirmPassphrase ? t('common.hide') : t('common.show') }}</span>
              </div>
            </div>
          </button>
        </div>
      </div>

      <div class="rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
        <div class="flex items-start gap-2">
          <font-awesome-icon :icon="['fas', 'exclamation-triangle']"
            class="mt-0.5 text-amber-600 dark:text-amber-400" />
          <div class="flex-1 text-sm text-amber-800 dark:text-amber-300">
            <p class="font-medium mb-1">{{ t('dataManagement.exportModal.warningTitle') }}</p>
            <p>{{ t('dataManagement.exportModal.warningDesc') }}</p>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex gap-3">
        <BaseButton variant="secondary" class="flex-1" @click="handleClose" :disabled="isLoading">
          {{ t('common.cancel') }}
        </BaseButton>
        <BaseButton class="flex-1" @click="handleExport" :loading="isLoading">
          <font-awesome-icon :icon="['fas', 'download']" class="mr-2" />
          {{ t('dataManagement.exportModal.exportButton') }}
        </BaseButton>
      </div>
    </template>
  </BottomSheet>
</template>
