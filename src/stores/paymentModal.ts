import { defineStore } from 'pinia'
import { ref } from 'vue'

const LEMONSQUEEZY_CHECKOUT_URL = 'https://fanbayy.lemonsqueezy.com/checkout/buy/db17c48d-ec06-4575-b419-bd32433e0cbe'

export const usePaymentModalStore = defineStore('paymentModal', () => {
  const showPaymentMethodModal = ref(false)
  const showManualPaymentModal = ref(false)
  const selectedManualMethodId = ref('')

  function openPaymentModal() {
    showPaymentMethodModal.value = true
    showManualPaymentModal.value = false
    selectedManualMethodId.value = ''
  }

  function closePaymentModal() {
    showPaymentMethodModal.value = false
    showManualPaymentModal.value = false
    selectedManualMethodId.value = ''
  }

  function onPaymentMethodSelect(method: string) {
    if (method === 'visa') {
      window.open(LEMONSQUEEZY_CHECKOUT_URL, '_blank')
      showPaymentMethodModal.value = false
    } else {
      selectedManualMethodId.value = method
      showPaymentMethodModal.value = false
      showManualPaymentModal.value = true
    }
  }

  function closeManualPayment() {
    showManualPaymentModal.value = false
    selectedManualMethodId.value = ''
  }

  function backFromManualToMethod() {
    showManualPaymentModal.value = false
    showPaymentMethodModal.value = true
  }

  return {
    showPaymentMethodModal,
    showManualPaymentModal,
    selectedManualMethodId,
    openPaymentModal,
    closePaymentModal,
    onPaymentMethodSelect,
    closeManualPayment,
    backFromManualToMethod,
  }
})
