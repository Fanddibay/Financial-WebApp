<script setup lang="ts">
import { computed, ref } from 'vue'
import { useProfileStore } from '@/stores/profile'
import { useThemeStore } from '@/stores/theme'
import { useTransactionStore } from '@/stores/transaction'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import ExportModal from '@/components/settings/ExportModal.vue'
import ImportModal from '@/components/settings/ImportModal.vue'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { importData } from '@/utils/dataExport'
import { usePWAInstall } from '@/composables/usePWAInstall'

const profileStore = useProfileStore()
const themeStore = useThemeStore()
const transactionStore = useTransactionStore()
const { isInstallable, isInstalled, isInstalling, install } = usePWAInstall()

const isEditing = ref(false)
const editName = ref(profileStore.profile.name)
const editPhone = ref(profileStore.profile.phone)

// Export/Import modals
const showExportModal = ref(false)
const showImportModal = ref(false)
const showImportConfirm = ref(false)
const importFile = ref<File | null>(null)
const importPassphrase = ref('')
const isLoading = ref(false)

// Notifications
const notification = ref<{
  type: 'success' | 'error' | null
  message: string
}>({ type: null, message: '' })

function handleSave() {
  profileStore.updateProfile({
    name: editName.value,
    phone: editPhone.value,
  })
  isEditing.value = false
}

function handleCancel() {
  editName.value = profileStore.profile.name
  editPhone.value = profileStore.profile.phone
  isEditing.value = false
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function showNotification(type: 'success' | 'error', message: string) {
  notification.value = { type, message }
  setTimeout(() => {
    notification.value = { type: null, message: '' }
  }, 5000)
}

function handleExportSuccess(message: string) {
  showNotification('success', message)
  showExportModal.value = false
}

function handleExportError(message: string) {
  showNotification('error', message)
}

function handleImportConfirm(file: File, passphrase: string) {
  importFile.value = file
  importPassphrase.value = passphrase
  showImportModal.value = false
  showImportConfirm.value = true
}

async function handleImportExecute() {
  if (!importFile.value) return

  isLoading.value = true
  showImportConfirm.value = false

  try {
    const result = await importData(importFile.value, importPassphrase.value)

    // Refresh all stores to reflect imported data
    profileStore.updateProfile(profileStore.profile) // Trigger re-read from localStorage
    if (result.profileName) {
      profileStore.updateProfile({ name: result.profileName })
    }
    themeStore.initTheme() // Re-apply theme
    await transactionStore.fetchTransactions() // Reload transactions

    showNotification(
      'success',
      `Data berhasil diimpor! Memulihkan ${result.transactionCount} transaksi.`,
    )

    // Clear import state
    importFile.value = null
    importPassphrase.value = ''
  } catch (error) {
    showNotification(
      'error',
      error instanceof Error ? error.message : 'Failed to import data',
    )
  } finally {
    isLoading.value = false
  }
}

function handleImportError(message: string) {
  showNotification('error', message)
}

const avatarUrl = computed(() => profileStore.profile.avatar)
const displayName = computed(() => profileStore.profile.name || 'User')
const displayPhone = computed(() => profileStore.profile.phone || 'Belum diatur')

async function handleInstall() {
  const success = await install()
  if (success) {
    showNotification('success', 'Aplikasi berhasil diinstal!')
  }
}
</script>

<template>
  <div class="mx-auto max-w-[430px] space-y-6 px-4 pb-24 pt-8">
    <div>
      <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Profil</h1>
      <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Kelola pengaturan akun kamu</p>
    </div>

    <!-- Profile Info -->
    <BaseCard>
      <div class="space-y-6">
        <!-- Avatar Section -->
        <div class="flex flex-col items-center gap-4">
          <div
            class="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-dark text-3xl font-bold text-white shadow-lg">
            <span v-if="!avatarUrl">{{ getInitials(displayName) }}</span>
            <img v-else :src="avatarUrl" alt="Avatar" class="h-full w-full rounded-full object-cover" />
          </div>
          <div v-if="!isEditing" class="text-center">
            <h2 class="text-xl font-semibold text-slate-900 dark:text-slate-100">{{ displayName }}</h2>
            <p class="text-sm text-slate-500 dark:text-slate-400">{{ displayPhone }}</p>
          </div>
        </div>

        <!-- Edit Form -->
        <div v-if="isEditing" class="space-y-4">
          <BaseInput v-model="editName" label="Nama" placeholder="Masukkan nama kamu" />
          <BaseInput v-model="editPhone" label="Nomor Telepon" type="tel" placeholder="Masukkan nomor telepon kamu" />
          <div class="flex gap-3 pt-2">
            <BaseButton variant="secondary" class="flex-1" @click="handleCancel">Batal</BaseButton>
            <BaseButton class="flex-1" @click="handleSave">Simpan</BaseButton>
          </div>
        </div>

        <!-- View Mode -->
        <div v-else class="space-y-4">
          <div>
            <label class="text-sm font-medium text-slate-600 dark:text-slate-400">Nama</label>
            <p class="mt-1 text-slate-900 dark:text-slate-100">{{ displayName }}</p>
          </div>
          <div>
            <label class="text-sm font-medium text-slate-600 dark:text-slate-400">Nomor Telepon</label>
            <p class="mt-1 text-slate-900 dark:text-slate-100">{{ displayPhone }}</p>
          </div>
          <BaseButton variant="secondary" class="w-full" @click="isEditing = true">
            <font-awesome-icon :icon="['fas', 'edit']" class="mr-2" />
            Edit Profil
          </BaseButton>
        </div>
      </div>
    </BaseCard>

    <!-- Settings -->
    <BaseCard>
      <h3 class="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Pengaturan</h3>
      <div class="space-y-4">
        <!-- Notifications -->
        <div class="relative">
          <div class="flex items-center justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1">
                <h4 class="font-medium text-slate-900 dark:text-slate-100">Notifikasi</h4>
                <span
                  class="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                  Fitur yang akan datang
                </span>
              </div>
              <p class="text-sm text-slate-500 dark:text-slate-400">
                Aktifkan notifikasi push untuk mendapatkan pembaruan penting
              </p>
            </div>
            <div class="relative">
              <label class="relative inline-flex cursor-not-allowed items-center opacity-50">
                <input type="checkbox" disabled class="peer sr-only" />
                <div
                  class="peer h-6 w-11 rounded-full bg-slate-200 transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] dark:bg-slate-700 dark:after:border-slate-600" />
              </label>
            </div>
          </div>
          <div class="mt-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3">
            <div class="flex items-start gap-2">
              <font-awesome-icon :icon="['fas', 'circle-info']"
                class="mt-0.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <div class="flex-1">
                <p class="text-xs font-medium text-blue-800 dark:text-blue-300 mb-0.5">
                  Fitur Sedang Dikembangkan
                </p>
                <p class="text-xs text-blue-700 dark:text-blue-400">
                  Kami sedang mengembangkan fitur notifikasi push. Fitur ini akan segera hadir dalam update berikutnya.
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Theme Toggle -->
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <h4 class="font-medium text-slate-900 dark:text-slate-100">Tema</h4>
            <p class="text-sm text-slate-500 dark:text-slate-400">
              Mode {{ themeStore.theme === 'dark' ? 'Gelap' : 'Terang' }}
            </p>
          </div>
          <button type="button" @click="themeStore.toggleTheme()"
            class="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600">
            <font-awesome-icon v-if="themeStore.theme === 'light'" :icon="['fas', 'moon']" class="h-5 w-5" />
            <font-awesome-icon v-else :icon="['fas', 'sun']" class="h-5 w-5" />
          </button>
        </div>
      </div>
    </BaseCard>

    <!-- Data Management -->
    <BaseCard>
      <h3 class="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
        Manajemen Data
      </h3>
      <div class="space-y-4">
        <div class="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
          <div class="flex items-start gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10">
              <font-awesome-icon :icon="['fas', 'shield']" class="text-brand" />
            </div>
            <div class="flex-1">
              <h4 class="mb-1 font-medium text-slate-900 dark:text-slate-100">
                Backup & Restore
              </h4>
              <p class="text-sm text-slate-600 dark:text-slate-400">
                Ekspor data Anda sebagai file backup terenkripsi atau pulihkan dari backup sebelumnya.
                Data Anda dienkripsi dengan passphrase untuk keamanan.
              </p>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <BaseButton variant="secondary" class="w-full" @click="showExportModal = true">
            <font-awesome-icon :icon="['fas', 'download']" class="mr-2" />
            Eksport
          </BaseButton>
          <BaseButton variant="secondary" class="w-full" @click="showImportModal = true">
            <font-awesome-icon :icon="['fas', 'file-import']" class="mr-2" />
            Import
          </BaseButton>
        </div>

        <div class="rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <div class="flex items-start gap-2">
            <font-awesome-icon :icon="['fas', 'circle-info']" class="mt-0.5 text-amber-600 dark:text-amber-400" />
            <div class="flex-1 text-sm text-amber-800 dark:text-amber-300">
              <p class="font-medium mb-1">Penting</p>
              <p>
                Simpan passphrase Anda dengan aman. Tanpanya, Anda tidak dapat memulihkan backup Anda.
                Kami tidak pernah menyimpan passphrase Anda - hanya digunakan untuk enkripsi/dekripsi.
              </p>
            </div>
          </div>
        </div>
      </div>
    </BaseCard>

    <!-- PWA Install -->
    <BaseCard>
      <h3 class="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
        Instal Aplikasi
      </h3>
      <div class="space-y-4">
        <div
          class="rounded-lg bg-gradient-to-br from-brand/5 to-brand/10 p-4 dark:from-brand/10 dark:to-brand/20 border border-brand/20 dark:border-brand/30">
          <div class="flex items-start gap-3">
            <div
              class="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 dark:bg-brand/20 flex-shrink-0">
              <font-awesome-icon :icon="['fas', isInstalled ? 'check-circle' : 'download']"
                class="text-brand text-xl" />
            </div>
            <div class="flex-1 min-w-0">
              <h4 class="mb-1.5 font-semibold text-slate-900 dark:text-slate-100">
                {{ isInstalled ? 'Aplikasi Terinstal' : 'Instal Aplikasi di Perangkat Anda' }}
              </h4>
              <p v-if="isInstalled" class="text-sm text-slate-600 dark:text-slate-400">
                Aplikasi sudah terinstal di perangkat Anda. Nikmati akses cepat dan penggunaan offline.
              </p>
              <p v-else class="text-sm text-slate-600 dark:text-slate-400 mb-3">
                Instal aplikasi untuk mendapatkan pengalaman yang lebih baik dengan akses cepat dan penggunaan offline.
              </p>
              <div v-if="!isInstalled" class="space-y-2 mt-3">
                <div class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <div class="flex h-6 w-6 items-center justify-center rounded-full bg-brand/10 dark:bg-brand/20">
                    <font-awesome-icon :icon="['fas', 'bolt']" class="text-brand text-xs" />
                  </div>
                  <span>Akses lebih cepat dari layar utama</span>
                </div>
                <div class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <div class="flex h-6 w-6 items-center justify-center rounded-full bg-brand/10 dark:bg-brand/20">
                    <font-awesome-icon :icon="['fas', 'wifi']" class="text-brand text-xs" />
                  </div>
                  <span>Dapat digunakan tanpa koneksi internet</span>
                </div>
                <div class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <div class="flex h-6 w-6 items-center justify-center rounded-full bg-brand/10 dark:bg-brand/20">
                    <font-awesome-icon :icon="['fas', 'mobile']" class="text-brand text-xs" />
                  </div>
                  <span>Shortcut langsung di layar utama</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <BaseButton v-if="!isInstalled && isInstallable" :disabled="isInstalling" :loading="isInstalling" class="w-full"
          size="lg" @click="handleInstall">
          <font-awesome-icon :icon="['fas', 'download']" class="mr-2" />
          {{ isInstalling ? 'Menginstal...' : 'Instal Aplikasi' }}
        </BaseButton>

        <div v-else-if="!isInstalled && !isInstallable"
          class="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <div class="flex items-start gap-3">
            <font-awesome-icon :icon="['fas', 'circle-info']"
              class="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div class="flex-1">
              <p class="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                Cara Instal Manual (Android Chrome)
              </p>
              <ol class="text-sm text-blue-800 dark:text-blue-300 space-y-1.5 list-decimal list-inside">
                <li>Buka menu Chrome (3 titik di kanan atas)</li>
                <li>Pilih "Add to Home screen" atau "Install app"</li>
                <li>Klik "Install" atau "Add"</li>
                <li>Aplikasi akan muncul di layar utama</li>
              </ol>
              <p class="text-xs text-blue-700 dark:text-blue-400 mt-2">
                Jika opsi tidak muncul, pastikan Anda mengunjungi situs melalui HTTPS dan service worker sudah aktif.
              </p>
            </div>
          </div>
        </div>

        <div v-else-if="isInstalled"
          class="rounded-lg bg-green-50 p-4 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
              <font-awesome-icon :icon="['fas', 'check-circle']" class="text-green-600 dark:text-green-400 text-lg" />
            </div>
            <div class="flex-1">
              <p class="font-semibold text-green-900 dark:text-green-100 mb-0.5">
                Aplikasi Berhasil Terinstal
              </p>
              <p class="text-sm text-green-700 dark:text-green-300">
                Aplikasi sudah tersedia di perangkat Anda dan siap digunakan.
              </p>
            </div>
          </div>
        </div>
      </div>
    </BaseCard>

    <!-- Notification Toast -->
    <Transition enter-active-class="transition-all duration-300 ease-out" enter-from-class="opacity-0 translate-y-2"
      enter-to-class="opacity-100 translate-y-0" leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0" leave-to-class="opacity-0 translate-y-2">
      <div v-if="notification.type" :class="[
        'fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-lg px-4 py-3 shadow-lg max-w-[90%]',
        notification.type === 'success'
          ? 'bg-green-50 text-green-800 border border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800'
          : 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800',
      ]">
        <div class="flex items-center gap-3">
          <font-awesome-icon :icon="['fas', notification.type === 'success' ? 'check-circle' : 'exclamation-triangle']"
            :class="[
              'text-lg',
              notification.type === 'success'
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400',
            ]" />
          <p class="text-sm font-medium">{{ notification.message }}</p>
        </div>
      </div>
    </Transition>

    <!-- Modals -->
    <ExportModal :is-open="showExportModal" @close="showExportModal = false" @success="handleExportSuccess"
      @error="handleExportError" />

    <ImportModal :is-open="showImportModal" @close="showImportModal = false" @success="handleExportSuccess"
      @error="handleImportError" @confirm="handleImportConfirm" />

    <ConfirmModal :is-open="showImportConfirm" title="Konfirmasi Impor"
      message="Ini akan mengganti semua data Anda saat ini. Apakah Anda yakin ingin melanjutkan? Pastikan Anda memiliki backup dari data saat ini."
      confirm-text="Ya, Impor" cancel-text="Batal" variant="warning" :icon="['fas', 'exclamation-triangle']"
      @confirm="handleImportExecute" @close="showImportConfirm = false" />
  </div>
</template>
