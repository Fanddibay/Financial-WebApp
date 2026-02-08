<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { usePaymentModalStore } from '@/stores/paymentModal'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

// Import assets
import visaLogo from '@/assets/visa-seeklogo.svg'
import gopayLogo from '@/assets/gopay.svg'
import bcaLogo from '@/assets/bca.png'
import shopeepayLogo from '@/assets/shoopepay.svg'

interface Props {
  isOpen: boolean
  /** Show "Sudah punya token? Aktifkan" CTA below the button. Set false when opened from Settings/Profile. */
  showActivateTokenCta?: boolean
}

const props = withDefaults(defineProps<Props>(), { showActivateTokenCta: true })
const emit = defineEmits<{
  close: []
  select: [method: string]
}>()
const paymentModalStore = usePaymentModalStore()
const router = useRouter()

const { t } = useI18n()
const selectedMethod = ref('')

const paymentMethods = [
  {
    id: 'visa',
    title: t('payment.visaTitle'),
    desc: t('payment.visaDesc'),
    img: visaLogo,
    imgSize: 'h-4',
    bgColor: 'bg-[#1A1F71]/5'
  },
  {
    id: 'gopay',
    title: t('payment.gopayTitle'),
    desc: t('payment.gopayDesc'),
    img: gopayLogo,
    imgSize: 'h-5',
    bgColor: 'bg-[#00AED1]/5'
  },
  {
    id: 'bca',
    title: t('payment.bcaTitle'),
    desc: t('payment.bcaDesc'),
    img: bcaLogo,
    imgSize: 'h-7',
    bgColor: 'bg-[#0060AF]/5'
  },
  {
    id: 'shopeepay',
    title: t('payment.shopeepayTitle'),
    desc: t('payment.shopeepayDesc'),
    img: shopeepayLogo,
    imgSize: 'h-7',
    bgColor: 'bg-[#EE4D2D]/5'
  }
]

function handleContinue() {
  if (selectedMethod.value) {
    emit('select', selectedMethod.value)
  }
}

function goToSettingsToActivate() {
  // Tutup dulu semua modal di store, baru navigasi agar modal tidak tertinggal
  paymentModalStore.closeAllModals()
  emit('close')
  nextTick(() => {
    router.push({ path: '/profile', hash: '#license' })
  })
}
</script>

<template>
  <BottomSheet :is-open="isOpen" :title="t('payment.selectMethodTitle')" :subtitle="t('payment.selectMethodSubtitle')"
    max-height="90" :overlay-z-index="200" @close="emit('close')">
    <div class="space-y-3">
      <button v-for="method in paymentMethods" :key="method.id" type="button"
        class="flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition-all active:scale-[0.98]"
        :class="[
          selectedMethod === method.id
            ? 'border-brand bg-brand/5 dark:bg-brand/10 shadow-sm'
            : 'border-slate-100 bg-white hover:border-slate-200 dark:border-slate-700 dark:bg-slate-800/50'
        ]" @click="selectedMethod = method.id">
        <div
          class="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg overflow-hidden border border-slate-50 dark:border-slate-700/50"
          :class="method.bgColor">
          <img :src="method.img" :alt="method.title" :class="method.imgSize" class="object-contain" />
        </div>

        <div class="flex-1 min-w-0">
          <h4 class="font-semibold text-slate-900 dark:text-slate-100">{{ method.title }}</h4>
          <p class="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            {{ method.desc }}
          </p>
        </div>

        <div class="flex h-6 w-6 shrink-0 items-center justify-center pt-1">
          <div class="h-5 w-5 rounded-full border-2 transition-colors flex items-center justify-center" :class="[
            selectedMethod === method.id
              ? 'border-brand bg-brand shadow-sm'
              : 'border-slate-300 dark:border-slate-600'
          ]">
            <div v-if="selectedMethod === method.id" class="h-1.5 w-1.5 rounded-full bg-white" />
          </div>
        </div>
      </button>
    </div>

    <template #footer>
      <div class="space-y-3">
        <BaseButton class="w-full" size="lg" :disabled="!selectedMethod" @click="handleContinue">
          {{ t('payment.continue') }}
        </BaseButton>
        <p v-if="showActivateTokenCta" class="text-center text-sm text-slate-600 dark:text-slate-400">
          {{ t('payment.alreadyHaveToken') }}
          <button type="button" class="font-semibold text-brand hover:underline" @click="goToSettingsToActivate">
            {{ t('payment.activateToken') }}
          </button>
        </p>
      </div>
    </template>
  </BottomSheet>
</template>
