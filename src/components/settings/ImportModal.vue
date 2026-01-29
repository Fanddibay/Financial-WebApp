<script setup lang="ts">
import { computed, ref } from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

interface Props {
  isOpen: boolean
}

const props = defineProps<Props>()

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
const errors = ref({
  file: '',
  passphrase: '',
})

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  errors.value.file = ''

  if (!file) {
    return
  }

  // Validate file type
  if (!file.type.includes('json') && !file.name.endsWith('.json')) {
    errors.value.file = 'Silakan pilih file JSON yang valid'
    selectedFile.value = null
    return
  }

  selectedFile.value = file
}

function validate() {
  errors.value = { file: '', passphrase: '' }
  let isValid = true

  if (!selectedFile.value) {
    errors.value.file = 'Silakan pilih file backup'
    isValid = false
  }

  if (!passphrase.value || passphrase.value.length < 4) {
    errors.value.passphrase = 'Passphrase harus minimal 4 karakter'
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
  selectedFile.value = null
  passphrase.value = ''
  errors.value = { file: '', passphrase: '' }
  emit('close')
}

const fileName = computed(() => {
  return selectedFile.value?.name || 'Tidak ada file yang dipilih'
})
</script>

<template>
  <BaseModal :is-open="isOpen" size="sm" @close="handleClose">
    <template #header>
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10">
          <font-awesome-icon :icon="['fas', 'file-import']" class="text-brand" />
        </div>
        <div>
          <h2 class="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Impor Data
          </h2>
          <p class="text-xs text-slate-500 dark:text-slate-400">
            Pulihkan data dari backup terenkripsi
          </p>
        </div>
      </div>
    </template>

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
            <p class="font-medium mb-1">Impor menambah data</p>
            <p>
              Data yang diimpor akan ditambahkan ke data Anda yang ada. Data yang sudah ada
              tidak akan ditimpa. Transaksi dan kantong dari file akan digabung.
            </p>
          </div>
        </div>
      </div>

      <div class="space-y-3">
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            File Backup
          </label>
          <div class="space-y-2">
            <label
              class="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-3 transition hover:border-brand dark:border-slate-600 dark:bg-slate-700"
            >
              <font-awesome-icon
                :icon="['fas', 'upload']"
                class="text-slate-400"
              />
              <span class="flex-1 text-sm text-slate-700 dark:text-slate-300">
                {{ fileName }}
              </span>
              <span
                class="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 dark:bg-slate-600 dark:text-slate-300"
              >
                Pilih File
              </span>
              <input
                type="file"
                accept=".json,application/json"
                class="hidden"
                @change="handleFileSelect"
              />
            </label>
            <p v-if="errors.file" class="text-sm text-red-600 dark:text-red-400">
              {{ errors.file }}
            </p>
          </div>
        </div>

        <div>
          <BaseInput
            v-model="passphrase"
            label="Passphrase"
            :type="showPassphrase ? 'text' : 'password'"
            :error="errors.passphrase"
            placeholder="Masukkan passphrase yang digunakan saat ekspor"
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
      </div>

      <div
        class="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
      >
        <div class="flex items-start gap-2">
          <font-awesome-icon
            :icon="['fas', 'shield']"
            class="mt-0.5 text-blue-600 dark:text-blue-400"
          />
          <div class="flex-1 text-sm text-blue-800 dark:text-blue-300">
            <p class="font-medium mb-1">Keamanan</p>
            <p>
              Passphrase Anda tidak pernah disimpan. Dekripsi hanya terjadi di memori
              untuk keamanan Anda.
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
        <BaseButton class="flex-1" @click="handleImport" :loading="isLoading">
          <font-awesome-icon :icon="['fas', 'file-import']" class="mr-2" />
          Lanjutkan
        </BaseButton>
      </div>
    </template>
  </BaseModal>
</template>

