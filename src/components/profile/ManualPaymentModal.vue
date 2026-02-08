<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useProfileStore } from '@/stores/profile'
import { useToastStore } from '@/stores/toast'

// Import assets
import gopayLogo from '@/assets/gopay.svg'
import bcaLogo from '@/assets/bca.png'
import shopeepayLogo from '@/assets/shoopepay.svg'

interface Props {
  isOpen: boolean
  methodId: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  back: []
}>()

const { t } = useI18n()
const profileStore = useProfileStore()
const toastStore = useToastStore()

const allPaymentDetails = [
  { id: 'bca', label: 'BCA', value: '6801472904', img: bcaLogo, imgSize: 'h-6' },
  { id: 'gopay', label: 'GoPay', value: '087781522324', img: gopayLogo, imgSize: 'h-5' },
  { id: 'shopeepay', label: 'ShopeePay', value: '087781522324', img: shopeepayLogo, imgSize: 'h-6' }
]

const filteredPaymentDetails = computed(() => {
  return allPaymentDetails.filter(detail => detail.id === props.methodId)
})

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text)
  toastStore.success(t('payment.copySuccess'))
}

function handleIHavePaid() {
  const userName = profileStore.profile.name || 'User'
  const message = t('payment.waMessage', { name: userName })
  const url = `https://wa.me/6287781522324?text=${encodeURIComponent(message)}`
  window.open(url, '_blank')
}
</script>

<template>
  <BottomSheet :is-open="isOpen" :title="t('payment.detailsTitle')" :subtitle="t('payment.detailsSubtitle')"
    :overlay-z-index="200" @close="emit('close')">
    <div class="space-y-6">
      <!-- Info Card -->
      <div class="rounded-2xl border border-slate-100 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/50">
        <div class="space-y-4">
          <div class="flex justify-between items-center">
            <span class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{{
              t('payment.accountName') }}</span>
            <span class="font-semibold text-slate-900 dark:text-slate-100 italic">Fandi Bayu</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{{
              t('payment.totalAmount') }}</span>
            <span class="font-bold text-brand text-xl">{{ t('payment.priceValue') }}</span>
          </div>
        </div>
      </div>

      <!-- Payment Methods -->
      <div class="space-y-3">
        <div v-for="method in filteredPaymentDetails" :key="method.label"
          class="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 hover:border-slate-200 transition-colors">
          <div class="flex items-center gap-3">
            <div
              class="flex h-12 w-16 items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-700 overflow-hidden border border-slate-100 dark:border-slate-600">
              <img :src="method.img" :alt="method.label" :class="method.imgSize" class="object-contain" />
            </div>
            <div>
              <p class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">{{
                method.label }}</p>
              <p class="font-mono text-sm font-semibold tracking-tight dark:text-slate-200">{{
                method.value }}</p>
            </div>
          </div>
          <button type="button"
            class="rounded-lg bg-slate-50 px-3 py-2 text-[11px] font-bold uppercase tracking-tight text-slate-600 transition hover:bg-slate-100 active:scale-95 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
            @click="copyToClipboard(method.value)">
            <font-awesome-icon :icon="['fas', 'copy']" class="mr-1.5" />
            Copy
          </button>
        </div>
      </div>

      <!-- Info Box -->
      <div
        class="flex gap-3 rounded-xl bg-amber-50 p-4 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 shadow-sm shadow-amber-200/20">
        <font-awesome-icon :icon="['fas', 'circle-info']" class="mt-0.5 text-amber-600 dark:text-amber-400 shrink-0" />
        <p class="text-[11px] leading-relaxed font-medium text-amber-800 dark:text-amber-300">
          {{ t('payment.infoBox') }}
        </p>
      </div>
    </div>

    <template #footer>
      <div class="space-y-3">
        <BaseButton class="w-full" size="lg" @click="handleIHavePaid">
          <font-awesome-icon :icon="['fab', 'whatsapp']" class="mr-2" />
          {{ t('payment.paidButton') }}
        </BaseButton>
        <BaseButton variant="secondary" class="w-full text-slate-500 font-medium" @click="emit('back')">
          {{ t('payment.back') }}
        </BaseButton>
      </div>
    </template>
  </BottomSheet>
</template>
