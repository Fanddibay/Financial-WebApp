<script setup lang="ts">
import { useRouter } from 'vue-router'
import BaseButton from '@/components/ui/BaseButton.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

const router = useRouter()

function handleGoBack() {
  router.push('/')
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 dark:bg-slate-900">
    <div class="w-full max-w-md text-center">
      <!-- Access Denied Card -->
      <div class="rounded-2xl border border-slate-200 bg-white p-8 shadow-lg dark:border-slate-700 dark:bg-slate-800">
        <!-- Icon -->
        <div class="mb-6 flex justify-center">
          <div
            class="flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
            <FontAwesomeIcon :icon="['fas', 'circle-xmark']" class="text-3xl text-red-600 dark:text-red-400" />
          </div>
        </div>

        <!-- Message -->
        <h1 class="mb-3 text-2xl font-bold text-slate-900 dark:text-slate-100">
          Access Denied
        </h1>
        <p class="mb-8 text-slate-600 dark:text-slate-400">
          You do not have permission to access this page.
        </p>

        <!-- Action Button -->
        <BaseButton variant="primary" size="lg" @click="handleGoBack" class="w-full">
          <FontAwesomeIcon :icon="['fas', 'arrow-left']" />
          <span>Return to Home</span>
        </BaseButton>
      </div>

      <!-- Help Text -->
      <p class="mt-6 text-sm text-slate-500 dark:text-slate-400">
        If you believe this is an error, please contact your administrator.
      </p>
    </div>
  </div>
</template>

