import { defineStore } from 'pinia'
import { ref } from 'vue'

const LEMONSQUEEZY_CHECKOUT_URL = 'https://fanbayy.lemonsqueezy.com/checkout/buy/db17c48d-ec06-4575-b419-bd32433e0cbe'

export const usePaymentModalStore = defineStore('paymentModal', () => {
  const showPaymentMethodModal = ref(false)
  const showManualPaymentModal = ref(false)
  const selectedManualMethodId = ref('')
  /** Increment to signal all modals (Add Transaction, Scan Receipt, etc.) to close. Used when navigating to profile via "Aktifkan". */
  const closeAllModalsTrigger = ref(0)

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

  /** Close payment modals and signal other modals to close. Navigation to profile must be done by the component (useRouter in store is undefined). */
  function closeAllModals() {
    closePaymentModal()
    closeAllModalsTrigger.value += 1
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
    closeAllModalsTrigger,
    openPaymentModal,
    closePaymentModal,
    closeAllModals,
    onPaymentMethodSelect,
    closeManualPayment,
    backFromManualToMethod,
  }
})
