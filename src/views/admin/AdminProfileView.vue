<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAdminAuth } from '@/composables/useAdminAuth'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useToastStore } from '@/stores/toast'
import { supabase } from '@/services/supabase'

const router = useRouter()
const toastStore = useToastStore()
const { user, signOut, isAdmin, loading: authLoading } = useAdminAuth()

const loading = ref(false)
const error = ref<string | null>(null)

// Password change form
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const passwordErrors = ref({
  current: '',
  new: '',
  confirm: '',
})
const showPasswordChangeForm = ref(false)
const showSignOutConfirm = ref(false)
const showPasswordChangeConfirm = ref(false)

// Redirect if not admin
onMounted(() => {
  if (!authLoading.value && !isAdmin.value) {
    router.replace('/admin/access-denied')
  }
})

// Validate password form
function validatePasswordForm(): boolean {
  passwordErrors.value = {
    current: '',
    new: '',
    confirm: '',
  }

  let isValid = true

  if (!currentPassword.value) {
    passwordErrors.value.current = 'Current password is required'
    isValid = false
  }

  if (!newPassword.value) {
    passwordErrors.value.new = 'New password is required'
    isValid = false
  } else if (newPassword.value.length < 6) {
    passwordErrors.value.new = 'Password must be at least 6 characters'
    isValid = false
  }

  if (!confirmPassword.value) {
    passwordErrors.value.confirm = 'Please confirm your new password'
    isValid = false
  } else if (newPassword.value !== confirmPassword.value) {
    passwordErrors.value.confirm = 'Passwords do not match'
    isValid = false
  }

  return isValid
}

// Change password
async function handleChangePassword() {
  if (!validatePasswordForm()) {
    return
  }

  loading.value = true
  error.value = null

  try {
    // First, verify current password by attempting to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.value?.email || '',
      password: currentPassword.value,
    })

    if (signInError) {
      error.value = 'Current password is incorrect'
      passwordErrors.value.current = 'Current password is incorrect'
      loading.value = false
      return
    }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword.value,
    })

    if (updateError) {
      throw updateError
    }

    // Reset form
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    showPasswordChangeForm.value = false
    showPasswordChangeConfirm.value = false

    toastStore.success('Password changed successfully')
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to change password'
    toastStore.error(error.value)
  } finally {
    loading.value = false
  }
}

// Confirm password change
function confirmPasswordChange() {
  showPasswordChangeConfirm.value = false
  handleChangePassword()
}

// Sign out
async function handleSignOut() {
  showSignOutConfirm.value = false
  const result = await signOut()
  if (result.success) {
    router.push('/admin/login')
  } else {
    toastStore.error(result.error || 'Failed to sign out')
  }
}

// Toggle password change form
function togglePasswordChangeForm() {
  showPasswordChangeForm.value = !showPasswordChangeForm.value
  if (showPasswordChangeForm.value) {
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    passwordErrors.value = {
      current: '',
      new: '',
      confirm: '',
    }
    error.value = null
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 pb-20 dark:bg-slate-900">
    <!-- Header -->
    <div
      class="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-700 dark:bg-slate-900/80">
      <div class="mx-auto max-w-[430px] px-4 py-4">
        <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Admin Profile
        </h1>
        <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Manage your admin account
        </p>
      </div>
    </div>

    <!-- Content -->
    <div class="mx-auto max-w-[430px] px-4 py-4">
      <!-- Account Info Card -->
      <div
        class="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 class="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Account Information</h2>

        <div class="space-y-3">
          <div>
            <label class="text-xs font-medium text-slate-600 dark:text-slate-400">Email</label>
            <div
              class="mt-1 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-700/50">
              <FontAwesomeIcon :icon="['fas', 'envelope']" class="text-sm text-slate-400" />
              <span class="text-sm text-slate-900 dark:text-slate-100">{{ user?.email }}</span>
            </div>
          </div>

          <div>
            <label class="text-xs font-medium text-slate-600 dark:text-slate-400">Role</label>
            <div
              class="mt-1 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-700/50">
              <FontAwesomeIcon :icon="['fas', 'key']" class="text-sm text-slate-400" />
              <span class="text-sm text-slate-900 dark:text-slate-100">
                {{ user?.user_metadata?.role || 'Admin (whitelist)' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Password Change Card -->
      <div
        class="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">Security</h2>
          <BaseButton variant="ghost" size="sm" @click="togglePasswordChangeForm">
            <FontAwesomeIcon :icon="['fas', showPasswordChangeForm ? 'chevron-up' : 'chevron-down']" class="text-sm" />
            <span>{{ showPasswordChangeForm ? 'Cancel' : 'Change Password' }}</span>
          </BaseButton>
        </div>

        <!-- Password Change Form -->
        <div v-if="showPasswordChangeForm" class="space-y-4">
          <BaseInput v-model="currentPassword" type="password" label="Current Password"
            placeholder="Enter current password" :error="passwordErrors.current" autocomplete="current-password" />

          <BaseInput v-model="newPassword" type="password" label="New Password"
            placeholder="Enter new password (min. 6 characters)" :error="passwordErrors.new"
            autocomplete="new-password" />

          <BaseInput v-model="confirmPassword" type="password" label="Confirm New Password"
            placeholder="Confirm new password" :error="passwordErrors.confirm" autocomplete="new-password" />

          <div v-if="error"
            class="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
            <p class="text-sm text-red-800 dark:text-red-400">{{ error }}</p>
          </div>

          <BaseButton variant="primary" size="lg" :loading="loading" :disabled="loading" class="w-full"
            @click="showPasswordChangeConfirm = true">
            <span v-if="!loading">Change Password</span>
            <span v-else class="flex items-center gap-2">
              <FontAwesomeIcon :icon="['fas', 'spinner']" class="animate-spin" />
              Changing...
            </span>
          </BaseButton>
        </div>
      </div>

      <!-- Danger Zone -->
      <div class="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/20 dark:bg-red-900/10">
        <h2 class="mb-2 text-lg font-semibold text-red-900 dark:text-red-100">Danger Zone</h2>
        <p class="mb-4 text-sm text-red-800 dark:text-red-400">
          Sign out of your admin account. You'll need to log in again to access the admin panel.
        </p>
        <BaseButton variant="danger" size="lg" class="w-full" @click="showSignOutConfirm = true">
          <FontAwesomeIcon :icon="['fas', 'right-from-bracket']" />
          <span>Sign Out</span>
        </BaseButton>
      </div>
    </div>

    <!-- Confirm Modals -->
    <ConfirmModal :is-open="showSignOutConfirm" title="Sign Out"
      message="Are you sure you want to sign out? You'll need to log in again to access the admin panel."
      confirm-text="Sign Out" cancel-text="Cancel" variant="warning" :icon="['fas', 'sign-out-alt']"
      @confirm="handleSignOut" @close="showSignOutConfirm = false" />

    <ConfirmModal :is-open="showPasswordChangeConfirm" title="Change Password"
      message="Are you sure you want to change your password? You'll need to use the new password for future logins."
      confirm-text="Change Password" cancel-text="Cancel" variant="info" :icon="['fas', 'key']"
      @confirm="confirmPasswordChange" @close="showPasswordChangeConfirm = false" />
  </div>
</template>
