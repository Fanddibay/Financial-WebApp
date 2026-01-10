<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAdminAuth } from '@/composables/useAdminAuth'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

const router = useRouter()
const route = useRoute()
const { signIn, loading, error, isAdmin, user } = useAdminAuth()

const email = ref('')
const password = ref('')
const emailError = ref('')
const passwordError = ref('')
const isSubmitting = ref(false)

// Redirect if already logged in as admin
onMounted(() => {
  if (user.value && isAdmin.value) {
    const redirect = route.query.redirect as string | undefined
    router.replace(redirect || '/admin')
  }
})

function validateForm(): boolean {
  emailError.value = ''
  passwordError.value = ''

  if (!email.value.trim()) {
    emailError.value = 'Email is required'
    return false
  }

  if (!email.value.includes('@')) {
    emailError.value = 'Please enter a valid email address'
    return false
  }

  if (!password.value) {
    passwordError.value = 'Password is required'
    return false
  }

  return true
}

async function handleSubmit() {
  if (!validateForm()) {
    return
  }

  isSubmitting.value = true

  try {
    const result = await signIn(email.value, password.value)

    if (result.success) {
      // Redirect to original destination or admin dashboard
      const redirect = route.query.redirect as string | undefined
      router.push(redirect || '/admin')
    }
    // Error is handled by the composable and displayed via error ref
  } catch (err) {
    console.error('Login error:', err)
  } finally {
    isSubmitting.value = false
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    handleSubmit()
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 dark:bg-slate-900">
    <div class="w-full max-w-md">
      <!-- Login Card -->
      <div class="rounded-2xl border border-slate-200 bg-white p-8 shadow-lg dark:border-slate-700 dark:bg-slate-800">
        <!-- Header -->
        <div class="mb-8 text-center">
          <div class="mb-4 flex justify-center">
            <div
              class="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700">
              <FontAwesomeIcon :icon="['fas', 'shield-halved']" class="text-2xl text-slate-600 dark:text-slate-300" />
            </div>
          </div>
          <h1 class="mb-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
            Admin Login
          </h1>
          <p class="text-sm text-slate-600 dark:text-slate-400">
            This area is restricted to administrators only.
          </p>
        </div>

        <!-- Error Message -->
        <div
          v-if="error"
          class="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          <div class="flex items-start gap-2">
            <FontAwesomeIcon :icon="['fas', 'circle-exclamation']" class="mt-0.5 flex-shrink-0" />
            <span>{{ error }}</span>
          </div>
        </div>

        <!-- Login Form -->
        <form @submit.prevent="handleSubmit" class="space-y-6">
          <!-- Email Input -->
          <BaseInput
            v-model="email"
            type="email"
            label="Email"
            placeholder="admin@example.com"
            :error="emailError"
            :disabled="loading || isSubmitting"
            autocomplete="email"
            @keydown="handleKeydown" />

          <!-- Password Input -->
          <BaseInput
            v-model="password"
            type="password"
            label="Password"
            placeholder="Enter your password"
            :error="passwordError"
            :disabled="loading || isSubmitting"
            autocomplete="current-password"
            @keydown="handleKeydown" />

          <!-- Submit Button -->
          <BaseButton
            type="submit"
            variant="primary"
            size="lg"
            :loading="loading || isSubmitting"
            :disabled="loading || isSubmitting"
            class="w-full">
            <span v-if="!loading && !isSubmitting">Sign In</span>
            <span v-else class="flex items-center gap-2">
              <FontAwesomeIcon :icon="['fas', 'spinner']" class="animate-spin" />
              Signing in...
            </span>
          </BaseButton>
        </form>
      </div>

      <!-- Footer -->
      <div class="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        <router-link
          to="/"
          class="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200">
          <FontAwesomeIcon :icon="['fas', 'arrow-left']" />
          <span>Back to application</span>
        </router-link>
      </div>
    </div>
  </div>
</template>

