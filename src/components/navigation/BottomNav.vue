<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faHouse, faReceipt, faWallet, faUser, faPlus } from '@fortawesome/free-solid-svg-icons'
import AddTransactionModal from '@/components/transactions/AddTransactionModal.vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const route = useRoute()
const router = useRouter()

const showAddModal = ref(false)

const activeTab = computed(() => {
  const currentPath = route.path

  if (currentPath === '/') return 'home'
  if (currentPath.startsWith('/pockets')) return 'pockets'
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
    class="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
    <div class="mx-auto flex max-w-[430px] items-center justify-around px-2 py-4">


      <!-- Home Button -->
      <button :class="[
        'flex flex-col items-center gap-1 rounded-xl px-3 py-2 transition',
        activeTab === 'home'
          ? 'bg-brand/10 text-brand dark:bg-brand/20'
          : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100',
      ]" @click="navigate('/')">
        <font-awesome-icon :icon="faHouse" class="text-lg" />
        <span class="text-xs font-medium">{{ t('nav.home') }}</span>
      </button>

      <!-- Pockets Button -->
      <button :class="[
        'flex flex-col items-center gap-1 rounded-xl px-3 py-2 transition',
        activeTab === 'pockets'
          ? 'bg-brand/10 text-brand dark:bg-brand/20'
          : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100',
      ]" @click="navigate('/pockets')">
        <font-awesome-icon :icon="faWallet" class="text-lg" />
        <span class="text-xs font-medium">{{ t('nav.pockets') }}</span>
      </button>

      <!-- Add Button (Centered, Larger) -->
      <button
        class="relative -mt-8 flex h-16 w-16 items-center justify-center rounded-full bg-brand text-white shadow-lg transition hover:bg-brand-dark focus:outline-none focus:ring-4 focus:ring-brand/30"
        @click="openAddModal">
        <font-awesome-icon :icon="faPlus" class="text-2xl" />
      </button>

      <!-- Transactions Button -->
      <button :class="[
        'flex flex-col items-center gap-1 rounded-xl px-3 py-2 transition',
        activeTab === 'transactions'
          ? 'bg-brand/10 text-brand dark:bg-brand/20'
          : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100',
      ]" @click="navigate('/transactions')">
        <font-awesome-icon :icon="faReceipt" class="text-lg" />
        <span class="text-xs font-medium">{{ t('nav.transactions') }}</span>
      </button>

      <!-- Profile Button -->
      <button :class="[
        'flex flex-col items-center gap-1 rounded-xl px-3 py-2 transition',
        activeTab === 'profile'
          ? 'bg-brand/10 text-brand dark:bg-brand/20'
          : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100',
      ]" @click="navigate('/profile')">
        <font-awesome-icon :icon="faUser" class="text-lg" />
        <span class="text-xs font-medium">{{ t('nav.profile') }}</span>
      </button>
    </div>

    <AddTransactionModal :is-open="showAddModal" @close="showAddModal = false" />
  </nav>
</template>
