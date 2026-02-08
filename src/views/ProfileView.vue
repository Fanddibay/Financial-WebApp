<script setup lang="ts">
import { computed, ref } from 'vue'
import { useProfileStore } from '@/stores/profile'
import { useThemeStore } from '@/stores/theme'
import { useTransactionStore } from '@/stores/transaction'
import { usePocketStore } from '@/stores/pocket'
import { useTokenStore } from '@/stores/token'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import ExportModal from '@/components/settings/ExportModal.vue'
import ImportModal from '@/components/settings/ImportModal.vue'
import ImportExportGuideSheet from '@/components/settings/ImportExportGuideSheet.vue'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import AvatarPickerModal from '@/components/profile/AvatarPickerModal.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { importData } from '@/utils/dataExport'
import { usePWAInstall } from '@/composables/usePWAInstall'
import { useI18n } from 'vue-i18n'
import { saveLanguage } from '@/i18n'
import PaymentMethodModal from '@/components/profile/PaymentMethodModal.vue'
import ManualPaymentModal from '@/components/profile/ManualPaymentModal.vue'

const profileStore = useProfileStore()
const themeStore = useThemeStore()
const transactionStore = useTransactionStore()
const pocketStore = usePocketStore()
const tokenStore = useTokenStore()
const { isInstallable, isInstalled, isInstalling, install } = usePWAInstall()
const { t, locale } = useI18n()

const isEditing = ref(false)
const editName = ref(profileStore.profile.name)
/** Snapshot avatar when entering edit mode; restored on Cancel. */
const avatarWhenEditStarted = ref('')
const isPWAInstallOpen = ref(false)

// Export/Import modals
const showExportModal = ref(false)
const showImportModal = ref(false)
const showImportExportGuide = ref(false)
const showImportConfirm = ref(false)
const importFile = ref<File | null>(null)
const importPassphrase = ref('')
const isLoading = ref(false)

// Notifications (toast for license etc.)
const notification = ref<{
  type: 'success' | 'error' | null
  message: string
}>({ type: null, message: '' })

// Token Management
const licenseTokenInput = ref('')
const licenseError = ref<string | null>(null)
const isVerifyingLicense = ref(false)
const showDeactivateConfirm = ref(false)
const isDeactivating = ref(false)
const showSubscribedPopup = ref(false)
const showNotSubscribedPopup = ref(false)
const showPaymentMethods = ref(false)
const showManualPayment = ref(false)
const selectedManualMethodId = ref('')

async function handlePasteLicense() {
  try {
    const text = await navigator.clipboard.readText()
    // Normalize: trim, uppercase, remove extra spaces
    licenseTokenInput.value = tokenStore.normalizeLicenseKey(text)
    licenseError.value = null
  } catch {
    showNotification('error', t('license.pasteFailed'))
  }
}

function handleLicenseInput() {
  // Auto-normalize on input: trim, uppercase, remove extra spaces
  const normalized = tokenStore.normalizeLicenseKey(licenseTokenInput.value)
  licenseTokenInput.value = normalized
  // Clear error when user types
  licenseError.value = null
}

async function handleVerifyLicense() {
  // Normalize the input before processing
  const normalizedKey = tokenStore.normalizeLicenseKey(licenseTokenInput.value)

  // Basic validation - only check if key is not empty
  const validation = tokenStore.validateLicenseKeyInput(normalizedKey)
  if (!validation.valid) {
    licenseError.value = validation.error || t('license.enterKeyBeforeContinue')
    return
  }

  // Prevent double submission
  if (isVerifyingLicense.value) {
    return
  }

  isVerifyingLicense.value = true
  licenseError.value = null

  try {
    // Activate license - backend handles all validation
    const result = await tokenStore.activateLicense(normalizedKey)

    if (result.success) {
      showNotification('success', t('license.activationSuccess'))
      licenseTokenInput.value = ''
      licenseError.value = null
    } else {
      // Show user-friendly error message from backend
      const errorMsg = result.error || t('license.invalidKey')
      licenseError.value = errorMsg
      showNotification('error', errorMsg)
    }
  } catch (error) {
    console.error('Error activating license:', error)
    const errorMsg = t('license.networkError')
    licenseError.value = errorMsg
    showNotification('error', errorMsg)
  } finally {
    isVerifyingLicense.value = false
  }
}

async function handleDeactivateLicense() {
  showDeactivateConfirm.value = true
}

function handleOpenCheckout() {
  showNotSubscribedPopup.value = false
  showPaymentMethods.value = true
}

function handlePaymentMethodSelect(method: string) {
  if (method === 'visa') {
    window.open('https://fanbayy.lemonsqueezy.com/checkout/buy/db17c48d-ec06-4575-b419-bd32433e0cbe', '_blank')
    showPaymentMethods.value = false
  } else {
    selectedManualMethodId.value = method
    showPaymentMethods.value = false
    showManualPayment.value = true
  }
}

async function confirmDeactivateLicense() {
  isDeactivating.value = true

  try {
    const result = await tokenStore.deactivateLicense()

    if (result.success) {
      showNotification('success', t('license.deactivationSuccess'))
      showDeactivateConfirm.value = false
    } else {
      const errorMsg = result.error || t('license.deactivationError')
      showNotification('error', errorMsg)
    }
  } catch (error) {
    console.error('Error deactivating license:', error)
    showNotification('error', t('license.networkError'))
  } finally {
    isDeactivating.value = false
  }
}

function handleSave() {
  profileStore.updateProfile({
    name: editName.value,
  })
  isEditing.value = false
}

function startEditing() {
  avatarWhenEditStarted.value = profileStore.profile.avatar ?? ''
  isEditing.value = true
}

function handleCancel() {
  editName.value = profileStore.profile.name
  profileStore.updateProfile({ avatar: avatarWhenEditStarted.value })
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

    themeStore.initTheme()
    await transactionStore.fetchTransactions()
    pocketStore.fetchPockets()

    const msg =
      result.pocketCount != null
        ? t('dataManagement.importSuccessAppendPockets', {
          pockets: result.pocketCount,
          transactions: result.transactionCount,
        })
        : t('dataManagement.importSuccessAppend', { count: result.transactionCount })
    showNotification('success', msg)

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

const avatarUrl = computed(() => profileStore.profile.avatar ?? '')
const displayName = computed(() => profileStore.profile.name || 'User')
const showAvatarPicker = ref(false)

async function handleInstall() {
  const success = await install()
  if (success) {
    showNotification('success', t('pwa.successTitle'))
  }
}

function handleLanguageChange(newLocale: 'id' | 'en') {
  locale.value = newLocale
  saveLanguage(newLocale)
  showNotification('success', t('settings.languageHelper'))
}

</script>

<template>
  <div class="mx-auto max-w-[430px] space-y-6 px-4 pb-32 pt-24">
    <PageHeader :title="t('profile.title')" :subtitle="t('profile.subtitle')">
      <template #right>
        <button type="button" :class="[
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition active:scale-95',
          tokenStore.isLicenseActive
            ? 'bg-amber-100 text-amber-600 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50'
            : 'bg-slate-100 text-slate-400 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-500 dark:hover:bg-slate-600',
        ]"
          :aria-label="tokenStore.isLicenseActive ? t('profile.subscribedPopupTitle') : t('profile.notSubscribedPopupTitle')"
          @click="tokenStore.isLicenseActive ? (showSubscribedPopup = true) : (showNotSubscribedPopup = true)">
          <font-awesome-icon :icon="['fas', 'crown']" class="h-5 w-5" />
        </button>
      </template>
    </PageHeader>

    <!-- Profile Info -->
    <BaseCard>
      <div class="space-y-6">
        <!-- Avatar Section: only editable when Edit Profile is active -->
        <div class="flex flex-col items-center gap-4">
          <!-- View mode: avatar is display-only, no edit icon -->
          <div v-if="!isEditing"
            class="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-dark text-3xl font-bold text-white shadow-lg overflow-hidden">
            <span v-if="!avatarUrl">{{ getInitials(displayName) }}</span>
            <img v-else :src="avatarUrl" alt="Avatar" class="h-full w-full object-cover" />
          </div>
          <!-- Edit mode: avatar is clickable with clear pencil icon (badge on top, slightly out to the right) -->
          <button v-else type="button"
            class="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-dark text-3xl font-bold text-white shadow-lg ring-2 ring-brand/30 transition hover:ring-brand/50 focus:outline-none focus:ring-2 focus:ring-brand"
            aria-label="Change avatar" @click="showAvatarPicker = true">
            <span class="absolute inset-0 overflow-hidden rounded-full">
              <span v-if="!avatarUrl">{{ getInitials(displayName) }}</span>
              <img v-else :src="avatarUrl" alt="Avatar" class="h-full w-full object-cover" />
            </span>
            <span
              class="absolute -bottom-0.5 -right-0.5 z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-white text-slate-600 shadow-md dark:border-slate-800 dark:bg-slate-700 dark:text-slate-200"
              aria-hidden="true">
              <font-awesome-icon :icon="['fas', 'edit']" class="text-sm" />
            </span>
          </button>
          <div v-if="!isEditing" class="text-center">
            <h2 class="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">{{ displayName }}</h2>
            <span :class="[
              'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium',
              tokenStore.isLicenseActive
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
            ]">
              {{ tokenStore.isLicenseActive ? t('profile.licenseActive') : t('profile.basicAccount') }}
            </span>
          </div>
        </div>

        <!-- Edit Form -->
        <div v-if="isEditing" class="space-y-4">
          <BaseInput v-model="editName" :label="t('profile.name')" :placeholder="t('profile.name')" />
          <div class="flex gap-3 pt-2">
            <BaseButton variant="secondary" class="flex-1" @click="handleCancel">{{ t('common.cancel') }}</BaseButton>
            <BaseButton class="flex-1" @click="handleSave">{{ t('common.save') }}</BaseButton>
          </div>
        </div>

        <!-- View Mode -->
        <div v-else class="space-y-4">
          <BaseButton variant="secondary" class="w-full" @click="startEditing">
            <font-awesome-icon :icon="['fas', 'edit']" class="mr-2" />
            {{ t('profile.editProfile') }}
          </BaseButton>
        </div>
      </div>
    </BaseCard>

    <!-- Token & License -->
    <div id="license">
      <BaseCard>
        <h3 class="mb-4 text-xl font-semibold text-slate-900 dark:text-slate-100">{{ t('license.title') }}</h3>
        <div class="space-y-4">
          <!-- Activate License Card -->
          <div class="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4">
            <div class="flex items-start gap-3 mb-4">
              <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 flex-shrink-0">
                <font-awesome-icon :icon="['fas', 'key']" class="text-brand" />
              </div>
              <div class="flex-1">
                <h4 class="mb-1 font-medium text-slate-900 dark:text-slate-100">{{ t('license.activateLicense') }}</h4>
                <p class="text-sm text-slate-600 dark:text-slate-400">
                  {{ t('license.activateLicenseDesc') }}
                </p>
              </div>
            </div>

            <!-- License Status Display -->
            <div v-if="tokenStore.licenseStatus === 'active' && tokenStore.isLicenseActive"
              class="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 mb-4">
              <div class="space-y-2">
                <div class="flex items-center gap-2">
                  <font-awesome-icon :icon="['fas', 'check-circle']" class="text-green-600 dark:text-green-400" />
                  <p class="text-sm font-medium text-green-800 dark:text-green-300">{{ t('license.licenseStatus') }}: {{
                    t('license.active') }}</p>
                </div>
                <div class="flex items-center gap-2">
                  <font-awesome-icon :icon="['fas', 'mobile-screen-button']"
                    class="text-green-600 dark:text-green-400 text-xs" />
                  <p class="text-xs text-green-700 dark:text-green-400">{{ t('license.device') }}</p>
                </div>
                <p class="text-xs text-green-700 dark:text-green-400 mt-1">
                  {{ t('license.activatedOn') }}
                  {{ new Date(tokenStore.tokenState.licenseActivatedAt || '').toLocaleDateString() }}
                </p>
              </div>
            </div>

            <!-- Checking Status -->
            <div v-else-if="tokenStore.licenseStatus === 'checking'"
              class="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 mb-4">
              <div class="flex items-center gap-2">
                <svg class="animate-spin h-4 w-4 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg"
                  fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                  </path>
                </svg>
                <p class="text-sm font-medium text-blue-800 dark:text-blue-300">{{ t('license.checking') }}</p>
              </div>
            </div>

            <!-- Error Status -->
            <div v-else-if="tokenStore.licenseStatus === 'error'"
              class="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 mb-4">
              <div class="flex items-center gap-2">
                <font-awesome-icon :icon="['fas', 'exclamation-triangle']" class="text-red-600 dark:text-red-400" />
                <p class="text-sm font-medium text-red-800 dark:text-red-300">{{ t('license.error') }}</p>
              </div>
              <p class="text-xs text-red-700 dark:text-red-400 mt-1">
                {{ t('license.errorDesc') }}
              </p>
            </div>

            <!-- Basic Account Status -->
            <div v-else
              class="rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-3 mb-4">
              <div class="flex items-center gap-2">
                <font-awesome-icon :icon="['fas', 'circle-info']" class="text-slate-600 dark:text-slate-400" />
                <p class="text-sm font-medium text-slate-700 dark:text-slate-300">{{ t('license.basic') }}</p>
              </div>
            </div>

            <!-- Get Token CTA (only show when license is not active) -->
            <div v-if="!tokenStore.isLicenseActive"
              class="rounded-lg bg-gradient-to-br from-brand/5 via-brand/10 to-brand/15 dark:from-brand/10 dark:via-brand/15 dark:to-brand/20 border border-brand/20 dark:border-brand/30 p-4 mb-4">
              <div class="flex items-start gap-3 mb-3">
                <div
                  class="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/20 dark:bg-brand/30 flex-shrink-0">
                  <font-awesome-icon :icon="['fas', 'web-awesome']" class="text-brand text-lg" />
                </div>
                <div class="flex-1">
                  <h4 class="mb-1 font-semibold text-slate-900 dark:text-slate-100">{{ t('license.upgradeToPremium') }}
                  </h4>
                  <p class="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {{ t('license.upgradeDesc') }}
                  </p>
                </div>
              </div>
              <BaseButton class="w-full text-white" variant="teritary" size="sm" @click="handleOpenCheckout">
                <font-awesome-icon :icon="['fas', 'shopping-cart']" class="mr-2" />
                {{ t('license.getToken') }}
              </BaseButton>
            </div>

            <!-- Activate License Form (only show when license is not active) -->
            <div v-if="!tokenStore.isLicenseActive" class="space-y-3">
              <div class="flex gap-2">
                <div class="flex-1">
                  <input v-model="licenseTokenInput" type="text" :placeholder="t('license.pastePlaceholder')"
                    class="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2.5 text-sm font-mono focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    :disabled="isVerifyingLicense" @input="handleLicenseInput" />
                </div>
                <BaseButton variant="secondary" size="sm" :disabled="isVerifyingLicense" @click="handlePasteLicense"
                  class="shrink-0">
                  <font-awesome-icon :icon="['fas', 'paste']" class="mr-1" />
                  {{ t('license.paste') }}
                </BaseButton>
              </div>

              <!-- Error Message -->
              <Transition enter-active-class="transition-all duration-200 ease-out"
                enter-from-class="opacity-0 -translate-y-1" enter-to-class="opacity-100 translate-y-0"
                leave-active-class="transition-all duration-150 ease-in" leave-from-class="opacity-100 translate-y-0"
                leave-to-class="opacity-0 -translate-y-1">
                <div v-if="licenseError"
                  class="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
                  <div class="flex items-start gap-2">
                    <font-awesome-icon :icon="['fas', 'exclamation-circle']"
                      class="text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0 text-sm" />
                    <p class="text-xs text-red-800 dark:text-red-300 leading-relaxed flex-1">{{ licenseError }}</p>
                  </div>
                </div>
              </Transition>

              <!-- Activate Button -->
              <BaseButton :loading="isVerifyingLicense" :disabled="isVerifyingLicense || !licenseTokenInput.trim()"
                class="w-full" @click="handleVerifyLicense">
                <font-awesome-icon v-if="!isVerifyingLicense" :icon="['fas', 'check']" class="mr-2" />
                {{ isVerifyingLicense ? t('license.activating') : t('license.activate') }}
              </BaseButton>
            </div>

            <!-- Deactivate License Button -->
            <BaseButton v-if="tokenStore.isLicenseActive" variant="secondary" size="sm" class="w-full mt-3"
              @click="handleDeactivateLicense">
              <font-awesome-icon :icon="['fas', 'unlink']" class="mr-2" />
              {{ t('license.deactivate') }}
            </BaseButton>
          </div>
        </div>
      </BaseCard>
    </div>

    <!-- Settings -->
    <BaseCard>
      <h3 class="mb-4 text-xl font-semibold text-slate-900 dark:text-slate-100">{{ t('settings.title') }}</h3>
      <div class="space-y-4">
        <!-- Notifications: coming soon -->
        <div class="rounded-lg border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-800/30">
          <h4 class="font-medium text-slate-900 dark:text-slate-100">{{ t('settings.notifications') }}</h4>
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {{ t('settings.featureInDevelopmentDesc') }}
          </p>
          <p class="mt-2 text-xs font-medium text-amber-600 dark:text-amber-400">
            {{ t('settings.comingSoon') }}
          </p>
        </div>

        <!-- Language Switcher -->
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <h4 class="font-medium text-slate-900 dark:text-slate-100">{{ t('settings.language') }}</h4>
            </div>
            <p class="text-sm text-slate-500 dark:text-slate-400">
              {{ t('settings.languageDesc') }}
            </p>
            <p class="text-xs text-slate-400 dark:text-slate-500 mt-1">
              {{ t('settings.languageHelper') }}
            </p>
          </div>
        </div>
        <div class="flex gap-2">
          <button type="button" @click="handleLanguageChange('id')" :class="[
            'flex-1 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all',
            locale === 'id'
              ? 'border-brand bg-brand/10 text-brand dark:bg-brand/20 dark:border-brand'
              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-700',
          ]">
            🇮🇩 {{ t('settings.indonesian') }}
          </button>
          <button type="button" @click="handleLanguageChange('en')" :class="[
            'flex-1 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all',
            locale === 'en'
              ? 'border-brand bg-brand/10 text-brand dark:bg-brand/20 dark:border-brand'
              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-700',
          ]">
            🇬🇧 {{ t('settings.english') }}
          </button>
        </div>

        <!-- Theme Toggle -->
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <h4 class="font-medium text-slate-900 dark:text-slate-100">{{ t('settings.theme') }}</h4>
            <p class="text-sm text-slate-500 dark:text-slate-400">
              {{ themeStore.theme === 'dark' ? t('settings.themeDark') : t('settings.themeLight') }}
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
      <div class="mb-4 flex items-center justify-between gap-3">
        <h3 class="text-xl font-semibold text-slate-900 dark:text-slate-100">
          {{ t('dataManagement.title') }}
        </h3>
        <button type="button"
          class="shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-brand transition hover:bg-brand/10 dark:hover:bg-brand/20"
          @click="showImportExportGuide = true">
          {{ t('dataManagement.howItWorks') }}
        </button>
      </div>
      <div class="space-y-4">
        <div class="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
          <div class="flex items-start gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10">
              <font-awesome-icon :icon="['fas', 'shield']" class="text-brand" />
            </div>
            <div class="flex-1">
              <h4 class="mb-1 font-medium text-slate-900 dark:text-slate-100">
                {{ t('dataManagement.backupRestore') }}
              </h4>
              <p class="text-sm text-slate-600 dark:text-slate-400">
                {{ t('dataManagement.backupRestoreDesc') }}
              </p>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <BaseButton variant="secondary" class="w-full" @click="showExportModal = true">
            <font-awesome-icon :icon="['fas', 'download']" class="mr-2" />
            {{ t('dataManagement.export') }}
          </BaseButton>
          <BaseButton variant="secondary" class="w-full" @click="showImportModal = true">
            <font-awesome-icon :icon="['fas', 'file-import']" class="mr-2" />
            {{ t('dataManagement.import') }}
          </BaseButton>
        </div>

        <div class="rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <div class="flex items-start gap-2">
            <font-awesome-icon :icon="['fas', 'circle-info']" class="mt-0.5 text-amber-600 dark:text-amber-400" />
            <div class="flex-1 text-sm text-amber-800 dark:text-amber-300">
              <p class="font-medium mb-1">{{ t('dataManagement.important') }}</p>
              <p>
                {{ t('dataManagement.importantDesc') }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </BaseCard>

    <!-- Help / Bantuan -->
    <BaseCard>
      <div class="space-y-4">
        <div>
          <h3 class="text-xl font-semibold text-slate-900 dark:text-slate-100">
            {{ t('profile.help.title') }}
          </h3>
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {{ t('profile.help.subtitle') }}
          </p>
        </div>

        <!-- WhatsApp CTA -->
        <a href="https://wa.me/6287781522324" target="_blank" rel="noopener noreferrer"
          class="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 transition hover:border-green-300 hover:bg-green-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-green-700 dark:hover:bg-green-900/20">
          <div
            class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <font-awesome-icon :icon="['fab', 'whatsapp']" class="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <div class="flex-1 min-w-0">
            <h4 class="font-semibold text-slate-900 dark:text-slate-100">
              {{ t('profile.help.whatsapp') }}
            </h4>
            <p class="text-sm text-slate-600 dark:text-slate-400">
              {{ t('profile.help.whatsappDesc') }}
            </p>
          </div>
          <font-awesome-icon :icon="['fas', 'chevron-right']" class="h-4 w-4 shrink-0 text-slate-400" />
        </a>

        <!-- Email CTA -->
        <a href="mailto:fandi.bayu110@gmail.com"
          class="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 transition hover:border-blue-300 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-blue-700 dark:hover:bg-blue-900/20">
          <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
            <font-awesome-icon :icon="['fas', 'envelope']" class="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div class="flex-1 min-w-0">
            <h4 class="font-semibold text-slate-900 dark:text-slate-100">
              {{ t('profile.help.email') }}
            </h4>
            <p class="text-sm text-slate-600 dark:text-slate-400">
              {{ t('profile.help.emailDesc') }}
            </p>
          </div>
          <font-awesome-icon :icon="['fas', 'chevron-right']" class="h-4 w-4 shrink-0 text-slate-400" />
        </a>

        <!-- Website Link - Tertiary style -->
        <a href="https://fanplanner.site" target="_blank" rel="noopener noreferrer"
          class="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-700">
          <font-awesome-icon :icon="['fas', 'globe']" class="h-4 w-4" />
          <span>{{ t('profile.help.visitWebsite') }}</span>
          <font-awesome-icon :icon="['fas', 'external-link-alt']" class="h-3 w-3 text-slate-400" />
        </a>
      </div>
    </BaseCard>

    <!-- PWA Install -->
    <BaseCard>
      <button type="button" @click="isPWAInstallOpen = !isPWAInstallOpen"
        class="flex w-full items-center justify-between gap-3 text-left transition-colors hover:opacity-80">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 dark:bg-brand/20 flex-shrink-0">
            <font-awesome-icon :icon="['fas', isInstalled ? 'check-circle' : 'download']" class="text-brand" />
          </div>
          <div>
            <h3 class="text-xl font-semibold text-slate-900 dark:text-slate-100">
              {{ t('pwa.title') }}
            </h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {{ isInstalled ? t('pwa.installed') : t('pwa.installTitle') }}
            </p>
          </div>
        </div>
        <font-awesome-icon :icon="['fas', 'chevron-down']"
          :class="['text-slate-400 dark:text-slate-500 transition-transform duration-200 flex-shrink-0', isPWAInstallOpen ? 'rotate-180' : '']" />
      </button>

      <Transition enter-active-class="transition-all duration-300 ease-out" enter-from-class="opacity-0 -translate-y-2"
        enter-to-class="opacity-100 translate-y-0" leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="opacity-100 translate-y-0" leave-to-class="opacity-0 -translate-y-2">
        <div v-if="isPWAInstallOpen" class="mt-4 space-y-4">
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
                  {{ isInstalled ? t('pwa.installedTitle') : t('pwa.installTitle') }}
                </h4>
                <p v-if="isInstalled" class="text-sm text-slate-600 dark:text-slate-400">
                  {{ t('pwa.installedDesc') }}
                </p>
                <p v-else class="text-sm text-slate-600 dark:text-slate-400 mb-3">
                  {{ t('pwa.installDesc') }}
                </p>
                <div v-if="!isInstalled" class="space-y-2 mt-3">
                  <div class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <div class="flex h-6 w-6 items-center justify-center rounded-full bg-brand/10 dark:bg-brand/20">
                      <font-awesome-icon :icon="['fas', 'bolt']" class="text-brand text-xs" />
                    </div>
                    <span>{{ t('pwa.feature1') }}</span>
                  </div>
                  <div class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <div class="flex h-6 w-6 items-center justify-center rounded-full bg-brand/10 dark:bg-brand/20">
                      <font-awesome-icon :icon="['fas', 'wifi']" class="text-brand text-xs" />
                    </div>
                    <span>{{ t('pwa.feature2') }}</span>
                  </div>
                  <div class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <div class="flex h-6 w-6 items-center justify-center rounded-full bg-brand/10 dark:bg-brand/20">
                      <font-awesome-icon :icon="['fas', 'mobile']" class="text-brand text-xs" />
                    </div>
                    <span>{{ t('pwa.feature3') }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <BaseButton v-if="!isInstalled && isInstallable" :disabled="isInstalling" :loading="isInstalling"
            class="w-full" size="lg" @click="handleInstall">
            <font-awesome-icon :icon="['fas', 'download']" class="mr-2" />
            {{ isInstalling ? t('pwa.installing') : t('pwa.installButton') }}
          </BaseButton>

          <div v-else-if="!isInstalled && !isInstallable"
            class="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <div class="flex items-start gap-3">
              <font-awesome-icon :icon="['fas', 'circle-info']"
                class="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div class="flex-1">
                <p class="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  {{ t('pwa.manualTitle') }}
                </p>
                <ol class="text-sm text-blue-800 dark:text-blue-300 space-y-1.5 list-decimal list-inside">
                  <li>{{ t('pwa.manualStep1') }}</li>
                  <li>{{ t('pwa.manualStep2') }}</li>
                  <li>{{ t('pwa.manualStep3') }}</li>
                  <li>{{ t('pwa.manualStep4') }}</li>
                </ol>
                <p class="text-xs text-blue-700 dark:text-blue-400 mt-2">
                  {{ t('pwa.manualNote') }}
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
                  {{ t('pwa.successTitle') }}
                </p>
                <p class="text-sm text-green-700 dark:text-green-300">
                  {{ t('pwa.successDesc') }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Transition>
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

    <ImportExportGuideSheet :is-open="showImportExportGuide" @close="showImportExportGuide = false" />

    <ConfirmModal :is-open="showImportConfirm" :title="t('dataManagement.importConfirmTitle')"
      :message="t('dataManagement.importConfirmMessage')" :confirm-text="t('dataManagement.importConfirmButton')"
      :cancel-text="t('common.cancel')" variant="info" :icon="['fas', 'circle-info']" @confirm="handleImportExecute"
      @close="showImportConfirm = false" />

    <!-- Deactivate License Confirmation Modal -->
    <ConfirmModal :is-open="showDeactivateConfirm" :title="t('license.deactivateConfirmTitle')"
      :message="t('license.deactivateConfirmMessage')" :confirm-text="t('license.deactivateConfirmButton')"
      :cancel-text="t('license.deactivateCancelButton')" variant="warning" :icon="['fas', 'unlink']"
      @confirm="confirmDeactivateLicense" @close="showDeactivateConfirm = false" />

    <!-- Avatar Picker Modal -->
    <AvatarPickerModal :is-open="showAvatarPicker" @close="showAvatarPicker = false" />

    <!-- Subscribed (crown) popup -->
    <BottomSheet :is-open="showSubscribedPopup" :title="t('profile.subscribedPopupTitle')" max-height="60"
      @close="showSubscribedPopup = false">
      <p class="text-slate-600 dark:text-slate-300">{{ t('profile.subscribedPopupMessage') }}</p>
      <template #footer>
        <BaseButton class="w-full" @click="showSubscribedPopup = false">
          {{ t('common.close') }}
        </BaseButton>
      </template>
    </BottomSheet>

    <!-- Not subscribed (crown) popup -->
    <BottomSheet :is-open="showNotSubscribedPopup" :title="t('profile.notSubscribedPopupTitle')" max-height="60"
      @close="showNotSubscribedPopup = false">
      <p class="text-slate-600 dark:text-slate-300">{{ t('profile.notSubscribedPopupMessage') }}</p>
      <template #footer>
        <div class="flex flex-col gap-2">
          <BaseButton class="w-full text-white" variant="teritary" @click="handleOpenCheckout">
            <font-awesome-icon :icon="['fas', 'shopping-cart']" class="mr-2" />
            {{ t('profile.getTokenCta') }}
          </BaseButton>
          <BaseButton variant="secondary" class="w-full" @click="showNotSubscribedPopup = false">
            {{ t('common.close') }}
          </BaseButton>
        </div>
      </template>
    </BottomSheet>

    <PaymentMethodModal :is-open="showPaymentMethods" @close="showPaymentMethods = false"
      @select="handlePaymentMethodSelect" />

    <ManualPaymentModal :is-open="showManualPayment" :method-id="selectedManualMethodId"
      @close="showManualPayment = false" @back="showManualPayment = false; showPaymentMethods = true" />
  </div>
</template>
