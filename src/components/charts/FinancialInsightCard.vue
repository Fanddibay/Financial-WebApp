<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

interface Props {
  totalIncome: number
  totalExpenses: number
}

const props = defineProps<Props>()

const STORAGE_KEY = 'financial-insight-dismissed'
const isDismissed = ref(false)

// Load dismissed state from localStorage
onMounted(() => {
  const stored = localStorage.getItem(STORAGE_KEY)
  isDismissed.value = stored === 'true'
})

// Determine message type and content
const insightType = computed<'positive' | 'warning' | null>(() => {
  if (props.totalIncome === 0 && props.totalExpenses === 0) {
    return null // No transactions yet
  }
  if (props.totalExpenses > props.totalIncome) {
    return 'warning'
  }
  return 'positive'
})

const message = computed(() => {
  if (insightType.value === 'warning') {
    return 'Pengeluaranmu lebih tinggi dari pendapatan bulan ini. Pertimbangkan untuk meninjau pengeluaranmu 💡'
  } else if (insightType.value === 'positive') {
    return 'Bagus! Kamu mengelola pengeluaranmu dengan baik 🎉'
  }
  return ''
})

const toggleDismiss = () => {
  isDismissed.value = !isDismissed.value
  localStorage.setItem(STORAGE_KEY, isDismissed.value.toString())
}
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="opacity-0 translate-y-2"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition-all duration-200 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 translate-y-2"
  >
    <BaseCard
      v-if="insightType && !isDismissed"
      :class="[
        'relative overflow-hidden',
        insightType === 'warning'
          ? 'bg-amber-50/50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800/50'
          : 'bg-green-50/50 border-green-200 dark:bg-green-900/10 dark:border-green-800/50'
      ]"
    >
      <!-- Dismiss button -->
      <button
        @click="toggleDismiss"
        :class="[
          'absolute top-3 right-3 rounded-lg p-1.5 transition hover:bg-black/5 dark:hover:bg-white/10',
          insightType === 'warning'
            ? 'text-amber-600 dark:text-amber-400'
            : 'text-green-600 dark:text-green-400'
        ]"
        type="button"
        aria-label="Tutup wawasan"
      >
        <FontAwesomeIcon :icon="['fas', 'times']" class="h-4 w-4" />
      </button>

      <!-- Content -->
      <div class="flex items-start gap-3 pr-8">
        <!-- Icon -->
        <div
          :class="[
            'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full',
            insightType === 'warning'
              ? 'bg-amber-100 dark:bg-amber-900/30'
              : 'bg-green-100 dark:bg-green-900/30'
          ]"
        >
          <FontAwesomeIcon
            :icon="['fas', insightType === 'warning' ? 'circle-info' : 'check-circle']"
            :class="[
              'text-lg',
              insightType === 'warning'
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-green-600 dark:text-green-400'
            ]"
          />
        </div>

        <!-- Message -->
        <div class="flex-1 pt-0.5">
          <p
            :class="[
              'text-sm leading-relaxed',
              insightType === 'warning'
                ? 'text-amber-800 dark:text-amber-200'
                : 'text-green-800 dark:text-green-200'
            ]"
          >
            {{ message }}
          </p>
        </div>
      </div>

      <!-- Show again button (optional, can be added later if needed) -->
    </BaseCard>
  </Transition>

  <!-- Show again button when dismissed -->
  <Transition
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-all duration-200 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <button
      v-if="insightType && isDismissed"
      @click="toggleDismiss"
      class="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 transition hover:border-brand/40 hover:bg-slate-50 hover:text-brand dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400 dark:hover:border-brand/40 dark:hover:bg-slate-800"
      type="button"
    >
      <FontAwesomeIcon :icon="['fas', 'eye']" class="mr-2" />
      Tampilkan wawasan keuangan
    </button>
  </Transition>
</template>

