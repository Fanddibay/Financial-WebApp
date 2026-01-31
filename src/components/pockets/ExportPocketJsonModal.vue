<script setup lang="ts">
import { ref } from 'vue'
import type { Pocket } from '@/types/pocket'
import { useProfileStore } from '@/stores/profile'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { exportPocketData } from '@/utils/dataExport'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const profileStore = useProfileStore()

interface Props {
  isOpen: boolean
  pocket: Pocket | null
  pocketTransactions: unknown[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  success: [message: string]
  error: [message: string]
}>()

const passphrase = ref('')
const showPassphrase = ref(false)
const isLoading = ref(false)
const error = ref('')

function validate() {
  error.value = ''
  if (!passphrase.value || passphrase.value.length < 4) {
    error.value = t('pocket.exportJsonPassphraseError')
    return false
  }
  return true
}

async function handleExport() {
  if (!validate() || !props.pocket) return
  isLoading.value = true
  error.value = ''
  try {
    const exportedBy = profileStore.profile?.name?.trim() || undefined
    await exportPocketData(
      props.pocket,
      props.pocketTransactions,
      passphrase.value,
      exportedBy,
    )
    emit('success', t('pocket.exportJsonSuccess'))
    handleClose()
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Export failed'
    error.value = msg
    emit('error', msg)
  } finally {
    isLoading.value = false
  }
}

function handleClose() {
  passphrase.value = ''
  showPassphrase.value = false
  error.value = ''
  emit('close')
}
</script>

<template>
  <BottomSheet :is-open="isOpen" :title="t('pocket.exportJsonTitle')" :subtitle="t('pocket.exportJsonDesc')" max-height="60" @close="handleClose">
    <div class="space-y-3">
      <BaseInput
        v-model="passphrase"
        :label="t('pocket.exportJsonPassphrase')"
        :type="showPassphrase ? 'text' : 'password'"
        :error="error"
        :placeholder="t('pocket.exportJsonPassphrasePlaceholder')"
      />
      <button
        type="button"
        class="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
        @click="showPassphrase = !showPassphrase"
      >
        <font-awesome-icon :icon="['fas', showPassphrase ? 'eye-slash' : 'eye']" class="h-3 w-3" />
        <span>{{ showPassphrase ? 'Hide' : 'Show' }}</span>
      </button>
    </div>
    <template #footer>
      <div class="flex gap-3">
        <BaseButton variant="secondary" class="flex-1" :disabled="isLoading" @click="handleClose">
          {{ t('common.cancel') }}
        </BaseButton>
        <BaseButton class="flex-1" :loading="isLoading" @click="handleExport">
          <font-awesome-icon :icon="['fas', 'download']" class="mr-2" />
          {{ t('pocket.exportJsonButton') }}
        </BaseButton>
      </div>
    </template>
  </BottomSheet>
</template>
