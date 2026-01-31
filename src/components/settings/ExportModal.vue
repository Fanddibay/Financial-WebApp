<script setup lang="ts">
import { ref } from 'vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { exportData } from '@/utils/dataExport'

interface Props {
  isOpen: boolean
}

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
    errors.value.passphrase = 'Passphrase harus minimal 4 karakter'
    isValid = false
  }

  if (passphrase.value !== confirmPassphrase.value) {
    errors.value.confirmPassphrase = 'Passphrase tidak cocok'
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
    emit('success', 'Data berhasil diekspor! File backup telah diunduh.')
    handleClose()
  } catch (error) {
    emit(
      'error',
      error instanceof Error ? error.message : 'Failed to export data',
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
  <BottomSheet :is-open="isOpen" title="Ekspor Data" subtitle="Buat backup terenkripsi dari data Anda" max-height="70" @close="handleClose">
    <div class="space-y-4">
      <div
        class="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
      >
        <div class="flex items-start gap-2">
          <font-awesome-icon
            :icon="['fas', 'circle-info']"
            class="mt-0.5 text-blue-600 dark:text-blue-400"
          />
          <div class="flex-1 text-sm text-blue-800 dark:text-blue-300">
            <p class="font-medium mb-1">Ekspor Aman</p>
            <p>
              Data Anda akan dienkripsi dengan passphrase. Pastikan Anda mengingat
              passphrase ini - Anda akan membutuhkannya untuk memulihkan data nanti.
            </p>
          </div>
        </div>
      </div>

      <div class="space-y-3">
        <div>
          <BaseInput
            v-model="passphrase"
            label="Passphrase"
            :type="showPassphrase ? 'text' : 'password'"
            :error="errors.passphrase"
            placeholder="Masukkan passphrase yang aman"
          />
          <div class="mt-1 flex items-center gap-2">
            <button
              type="button"
              @click.stop.prevent="showPassphrase = !showPassphrase"
              class="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
            >
              <font-awesome-icon
                :icon="['fas', showPassphrase ? 'eye-slash' : 'eye']"
                class="h-3 w-3"
              />
              <span>{{ showPassphrase ? 'Hide' : 'Show' }}</span>
            </button>
          </div>
        </div>

        <div>
          <BaseInput
            v-model="confirmPassphrase"
            label="Konfirmasi Passphrase"
            :type="showConfirmPassphrase ? 'text' : 'password'"
            :error="errors.confirmPassphrase"
            placeholder="Masukkan ulang passphrase"
          />
          <div class="mt-1 flex items-center gap-2">
            <button
              type="button"
              @click.stop.prevent="showConfirmPassphrase = !showConfirmPassphrase"
              class="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
            >
              <font-awesome-icon
                :icon="['fas', showConfirmPassphrase ? 'eye-slash' : 'eye']"
                class="h-3 w-3"
              />
              <span>{{ showConfirmPassphrase ? 'Hide' : 'Show' }}</span>
            </button>
          </div>
        </div>
      </div>

      <div
        class="rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
      >
        <div class="flex items-start gap-2">
          <font-awesome-icon
            :icon="['fas', 'exclamation-triangle']"
            class="mt-0.5 text-amber-600 dark:text-amber-400"
          />
          <div class="flex-1 text-sm text-amber-800 dark:text-amber-300">
            <p class="font-medium mb-1">Penting</p>
            <p>
              Simpan passphrase Anda dengan aman. Jika Anda kehilangannya, Anda tidak akan bisa
              memulihkan backup Anda.
            </p>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex gap-3">
        <BaseButton variant="secondary" class="flex-1" @click="handleClose" :disabled="isLoading">
          Batal
        </BaseButton>
        <BaseButton class="flex-1" @click="handleExport" :loading="isLoading">
          <font-awesome-icon :icon="['fas', 'download']" class="mr-2" />
          Ekspor
        </BaseButton>
      </div>
    </template>
  </BottomSheet>
</template>

