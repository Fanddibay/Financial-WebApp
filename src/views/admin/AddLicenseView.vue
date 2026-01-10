<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAdminAuth } from '@/composables/useAdminAuth'
import { useAdminLicenses } from '@/composables/useAdminLicenses'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useToastStore } from '@/stores/toast'

const router = useRouter()
const toastStore = useToastStore()
const { isAdmin, loading: authLoading } = useAdminAuth()
const { createLicense, activateLicense, loading, error, copyTokenToClipboard, fetchLicenses } = useAdminLicenses()

const generatedToken = ref<string | null>(null)
const showActivateConfirm = ref(false)

// Generate license token
async function handleGenerateToken() {
  const result = await createLicense()
  if (result.success && result.token) {
    generatedToken.value = result.token
    toastStore.success('License token generated successfully!')
  } else {
    toastStore.error(result.error || 'Failed to generate license token')
  }
}

// Handle activate
function handleActivateClick() {
  if (!generatedToken.value) return
  showActivateConfirm.value = true
}

// Confirm activate
async function confirmActivate() {
  if (!generatedToken.value) return

  const result = await activateLicense(generatedToken.value)
  if (result.success) {
    toastStore.success('License activated successfully!')
    // Refresh licenses list
    await fetchLicenses()
    // Redirect to dashboard after a short delay to show success
    setTimeout(() => {
      router.push('/admin')
    }, 1500)
  } else {
    toastStore.error(result.error || 'Failed to activate license')
    showActivateConfirm.value = false
  }
}

// Copy token to clipboard
async function handleCopyToken() {
  if (!generatedToken.value) return

  const result = await copyTokenToClipboard(generatedToken.value)
  if (result.success) {
    toastStore.success('Token copied to clipboard!')
  } else {
    toastStore.error('Failed to copy token')
  }
}

// Reset and generate new
function handleGenerateNew() {
  generatedToken.value = null
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 pb-20 dark:bg-slate-900">
    <!-- Header -->
    <div class="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-700 dark:bg-slate-900/80">
      <div class="mx-auto max-w-[430px] px-4 py-4">
        <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Add License
        </h1>
        <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Generate and activate new license tokens
        </p>
      </div>
    </div>

    <!-- Content -->
    <div class="mx-auto max-w-[430px] px-4 py-6">
      <!-- Error State -->
      <div v-if="error" class="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
        <div class="mb-2 flex items-start gap-3">
          <FontAwesomeIcon :icon="['fas', 'circle-exclamation']" class="mt-0.5 text-red-600 dark:text-red-400" />
          <div class="flex-1">
            <p class="mb-2 text-sm font-medium text-red-800 dark:text-red-400">Failed to create license</p>
            <p class="text-xs text-red-700 dark:text-red-300 leading-relaxed">{{ error }}</p>
          </div>
        </div>
        <div v-if="error.includes('permission') || error.includes('RLS') || error.includes('policy')" class="mt-3 rounded border border-red-300 bg-red-100 p-3 dark:border-red-700 dark:bg-red-900/30">
          <p class="mb-2 text-xs font-medium text-red-900 dark:text-red-200">Quick Fix:</p>
          <ol class="ml-4 list-decimal space-y-1 text-xs text-red-800 dark:text-red-300">
            <li>Go to Supabase Dashboard → Table Editor → license_tokens</li>
            <li>Check RLS Policies tab</li>
            <li>Ensure there's a policy allowing INSERT for authenticated users</li>
            <li>Policy should allow: INSERT operation for authenticated role</li>
          </ol>
        </div>
      </div>

      <!-- Before Generation -->
      <div v-if="!generatedToken" class="flex flex-col items-center justify-center py-12">
        <div class="mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-brand/10 dark:bg-brand/20">
          <FontAwesomeIcon :icon="['fas', 'key']" class="text-3xl text-brand dark:text-brand" />
        </div>

        <h2 class="mb-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
          Generate License Token
        </h2>
        <p class="mb-8 text-center text-sm text-slate-600 dark:text-slate-400">
          Click the button below to generate a new UUID-based license token. The token will be created in inactive status and can be activated immediately.
        </p>

        <BaseButton
          variant="primary"
          size="lg"
          :loading="loading"
          :disabled="loading"
          @click="handleGenerateToken"
          class="w-full max-w-xs">
          <span v-if="!loading">Generate License</span>
          <span v-else class="flex items-center gap-2">
            <FontAwesomeIcon :icon="['fas', 'spinner']" class="animate-spin" />
            Generating...
          </span>
        </BaseButton>
      </div>

      <!-- After Generation -->
      <div v-else class="space-y-6">
        <div class="rounded-xl border border-green-200 bg-green-50 p-6 dark:border-green-900/20 dark:bg-green-900/10">
          <div class="mb-4 flex items-center gap-2">
            <FontAwesomeIcon :icon="['fas', 'check-circle']" class="text-green-600 dark:text-green-400" />
            <h2 class="text-lg font-semibold text-green-900 dark:text-green-100">
              License Token Generated
            </h2>
          </div>
          <p class="mb-4 text-sm text-green-800 dark:text-green-400">
            Your license token has been created successfully. Copy it and activate it when ready.
          </p>

          <!-- Token Display -->
          <div class="mb-4">
            <label class="mb-2 block text-xs font-medium text-slate-700 dark:text-slate-300">
              License Token
            </label>
            <div class="flex items-center gap-2">
              <input
                :value="generatedToken"
                type="text"
                readonly
                class="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                style="cursor: text; user-select: all;" />
              <button
                @click="handleCopyToken"
                class="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                title="Copy token">
                <FontAwesomeIcon :icon="['fas', 'copy']" />
              </button>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex flex-col gap-3">
            <BaseButton
              variant="primary"
              size="lg"
              :loading="loading"
              :disabled="loading"
              @click="handleActivateClick"
              class="w-full">
              <FontAwesomeIcon :icon="['fas', 'check']" />
              <span>Activate License</span>
            </BaseButton>

            <BaseButton
              variant="secondary"
              size="lg"
              @click="handleGenerateNew"
              class="w-full">
              <FontAwesomeIcon :icon="['fas', 'plus']" />
              <span>Generate Another</span>
            </BaseButton>
          </div>
        </div>

        <!-- Info Box -->
        <div class="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
          <div class="flex items-start gap-3">
            <FontAwesomeIcon :icon="['fas', 'circle-info']" class="mt-0.5 text-slate-400" />
            <div class="text-sm text-slate-600 dark:text-slate-400">
              <p class="font-medium text-slate-900 dark:text-slate-100 mb-1">Next Steps:</p>
              <ol class="ml-4 list-decimal space-y-1">
                <li>Copy the license token above</li>
                <li>Click "Activate License" to make it active</li>
                <li>Share the token with your users</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Confirm Activate Modal -->
    <ConfirmModal
      :is-open="showActivateConfirm"
      title="Activate License"
      message="Are you sure you want to activate this license token? It will become immediately usable."
      confirm-text="Activate"
      cancel-text="Cancel"
      variant="info"
      :icon="['fas', 'check-circle']"
      @confirm="confirmActivate"
      @close="showActivateConfirm = false" />
  </div>
</template>

