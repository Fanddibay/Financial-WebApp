<script setup lang="ts">
import { useRouter } from 'vue-router'
import BaseButton from '@/components/ui/BaseButton.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

const router = useRouter()

function goToHome() {
  router.push('/')
}
</script>

<template>
  <div class="flex  items-start justify-center px-4 pt-8">
    <div class="mx-auto max-w-md w-full text-center">
      <!-- Illustration -->
      <div class="mb-8 flex justify-center">
        <div class="relative w-48 h-48 md:w-48 md:h-48">
          <!-- SVG Illustration with green theme -->
          <svg viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
            <!-- Background circle -->
            <circle cx="200" cy="200" r="180" fill="#dcfce7" class="animate-pulse-slow" />

            <!-- Main illustration - Lost document/file -->
            <g transform="translate(100, 80)">
              <!-- Document/Page -->
              <rect x="40" y="20" width="120" height="160" rx="4" fill="#86efac" opacity="0.6" />
              <rect x="50" y="35" width="100" height="8" rx="2" fill="#16a34a" opacity="0.3" />
              <rect x="50" y="55" width="80" height="8" rx="2" fill="#16a34a" opacity="0.3" />
              <rect x="50" y="75" width="90" height="8" rx="2" fill="#16a34a" opacity="0.3" />

              <!-- Question mark -->
              <text x="100" y="180" font-family="Arial, sans-serif" font-size="80" font-weight="bold" fill="#16a34a"
                text-anchor="middle">?</text>

              <!-- Floating elements -->
              <circle cx="20" cy="100" r="8" fill="#16a34a" opacity="0.4" class="animate-float"
                style="animation-delay: 0s;" />
              <circle cx="180" cy="60" r="6" fill="#22c55e" opacity="0.4" class="animate-float"
                style="animation-delay: 0.5s;" />
              <circle cx="160" cy="200" r="10" fill="#86efac" opacity="0.4" class="animate-float"
                style="animation-delay: 1s;" />
            </g>
          </svg>
        </div>
      </div>

      <!-- Error Code & Title -->
      <div class="mb-6">
        <h1 class="mb-3 text-4xl font-bold text-slate-900 dark:text-slate-100">
          404
        </h1>
        <h2 class="mb-2 text-xl font-semibold text-slate-800 dark:text-slate-200">
          Page Not Found
        </h2>
      </div>

      <!-- Description -->
      <p class="mb-8 text-base text-slate-600 dark:text-slate-400 leading-relaxed">
        Maaf, halaman yang Anda cari tidak ditemukan. Halaman mungkin telah dipindahkan, dihapus, atau URL yang Anda
        masukkan tidak valid.
      </p>

      <!-- Action Button -->
      <BaseButton variant="primary" size="md" @click="goToHome" class="w-full sm:w-auto">
        <FontAwesomeIcon :icon="['fas', 'house']" class="mr-2" />
        Kembali ke Beranda
      </BaseButton>
    </div>
  </div>
</template>
