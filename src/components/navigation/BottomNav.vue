<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faHouse, faReceipt, faWallet, faUser, faPlus } from '@fortawesome/free-solid-svg-icons'
import AddTransactionModal from '@/components/transactions/AddTransactionModal.vue'
import { useI18n } from 'vue-i18n'
import { usePaymentModalStore } from '@/stores/paymentModal'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const paymentModalStore = usePaymentModalStore()

const showAddModal = ref(false)
watch(() => paymentModalStore.closeAllModalsTrigger, () => {
  showAddModal.value = false
})

const activeTab = computed(() => {
  const currentPath = route.path

  if (currentPath === '/') return 'home'
  if (currentPath.startsWith('/pockets') || currentPath.startsWith('/goals')) return 'pockets'
  if (currentPath.startsWith('/transactions')) return 'transactions'
  if (currentPath === '/profile') return 'profile'
  return 'home'
})

function navigate(path: string) {
  router.push(path)
}

function openAddModal() {
  showAddModal.value = true
}
</script>

<template>
  <nav
    class="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-24px)] max-w-[400px] rounded-[2.5rem] border border-slate-200/60 bg-white/90 backdrop-blur-xl shadow-2xl dark:border-slate-700/60 dark:bg-slate-900/90 transition-all duration-300">
    <div class="flex items-center justify-around px-2 py-3">

      <!-- Home Button -->
      <button :class="[
        'flex flex-col items-center gap-1 rounded-2xl px-3 py-2 transition-all duration-200 active:scale-90',
        activeTab === 'home'
          ? 'text-brand'
          : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300',
      ]" @click="navigate('/')">
        <font-awesome-icon :icon="faHouse" class="text-xl" />
        <span class="text-[10px] font-bold uppercase tracking-wider">{{ t('nav.home') }}</span>
      </button>

      <!-- Pockets Button -->
      <button :class="[
        'flex flex-col items-center gap-1 rounded-2xl px-3 py-2 transition-all duration-200 active:scale-90',
        activeTab === 'pockets'
          ? 'text-brand'
          : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300',
      ]" @click="navigate('/pockets')">
        <font-awesome-icon :icon="faWallet" class="text-xl" />
        <span class="text-[10px] font-bold uppercase tracking-wider">{{ t('nav.pockets') }}</span>
      </button>

      <!-- Add Button (Centered, Floating) -->
      <div class="relative -mt-12">
        <button
          class="flex h-16 w-16 items-center justify-center rounded-full bg-brand text-white shadow-[0_12px_24px_rgba(66,184,131,0.4)] ring-[6px] ring-white dark:ring-slate-900 transition-all duration-300 hover:scale-110 active:scale-95 focus:outline-none"
          @click="openAddModal">
          <font-awesome-icon :icon="faPlus" class="text-2xl" />
        </button>
      </div>

      <!-- Transactions Button -->
      <button :class="[
        'flex flex-col items-center gap-1 rounded-2xl px-3 py-2 transition-all duration-200 active:scale-90',
        activeTab === 'transactions'
          ? 'text-brand'
          : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300',
      ]" @click="navigate('/transactions')">
        <font-awesome-icon :icon="faReceipt" class="text-xl" />
        <span class="text-[10px] font-bold uppercase tracking-wider">{{ t('nav.transactions') }}</span>
      </button>

      <!-- Profile Button -->
      <button :class="[
        'flex flex-col items-center gap-1 rounded-2xl px-3 py-2 transition-all duration-200 active:scale-90',
        activeTab === 'profile'
          ? 'text-brand'
          : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300',
      ]" @click="navigate('/profile')">
        <font-awesome-icon :icon="faUser" class="text-xl" />
        <span class="text-[10px] font-bold uppercase tracking-wider">{{ t('nav.profile') }}</span>
      </button>
    </div>

    <AddTransactionModal :is-open="showAddModal" @close="showAddModal = false" />
  </nav>
</template>
