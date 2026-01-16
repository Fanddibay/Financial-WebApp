<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import ReceiptScanner from '@/components/transactions/ReceiptScanner.vue'
import TextInputModal from '@/components/transactions/TextInputModal.vue'
import type { TransactionFormData } from '@/types/transaction'
import { useTransactions } from '@/composables/useTransactions'

interface Props {
  isOpen: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  close: []
}>()

const router = useRouter()
const { categories, createTransaction, fetchTransactions } = useTransactions()
const showScanner = ref(false)
const showTextInput = ref(false)

function handleAddByForm() {
  emit('close')
  router.push('/transactions/new')
}

function handleAddByScan() {
  showScanner.value = true
}

function handleAddByText() {
  showTextInput.value = true
}

async function handleScanComplete(data: TransactionFormData) {
  try {
    const transaction = await createTransaction(data)
    fetchTransactions()
    
    // Always store transaction data for notification with scanner flag
    // This ensures notification appears even if navigation is delayed
    try {
      sessionStorage.setItem('newTransaction', JSON.stringify({
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description,
        category: transaction.category,
        date: transaction.date,
        source: 'scanner', // Flag to indicate this came from scanner
      }))
    } catch (storageError) {
      console.warn('Failed to store notification in sessionStorage:', storageError)
    }
    
    showScanner.value = false
    emit('close')
    
    // Use nextTick to ensure sessionStorage is set before navigation
    await router.push('/')
    
    // Trigger notification check after navigation
    window.dispatchEvent(new Event('check-transaction-notification'))
  } catch (error) {
    console.error('Error creating transaction:', error)
    // Still try to show notification if transaction was created but navigation failed
    try {
      sessionStorage.setItem('newTransaction', JSON.stringify({
        ...data,
        source: 'scanner',
      }))
      window.dispatchEvent(new Event('check-transaction-notification'))
    } catch (storageError) {
      console.warn('Failed to store notification:', storageError)
    }
  }
}

async function handleScanCompleteMultiple(data: TransactionFormData[]) {
  try {
    const lastTransaction = data[data.length - 1]
    for (const transaction of data) {
      await createTransaction(transaction)
    }
    fetchTransactions()
    
    // Always store transaction data for notification with scanner flag and count
    if (lastTransaction) {
      try {
        sessionStorage.setItem('newTransaction', JSON.stringify({
          type: lastTransaction.type,
          amount: lastTransaction.amount,
          description: lastTransaction.description,
          category: lastTransaction.category,
          date: lastTransaction.date,
          source: 'scanner', // Flag to indicate this came from scanner
          count: data.length, // Number of transactions added
        }))
      } catch (storageError) {
        console.warn('Failed to store notification in sessionStorage:', storageError)
      }
    }
    
    showScanner.value = false
    emit('close')
    
    // Use nextTick to ensure sessionStorage is set before navigation
    await router.push('/')
    
    // Trigger notification check after navigation
    window.dispatchEvent(new Event('check-transaction-notification'))
  } catch (error) {
    console.error('Error creating transactions:', error)
    // Still try to show notification if transactions were created but navigation failed
    const lastTransaction = data[data.length - 1]
    if (lastTransaction) {
      try {
        sessionStorage.setItem('newTransaction', JSON.stringify({
          ...lastTransaction,
          source: 'scanner',
          count: data.length,
        }))
        window.dispatchEvent(new Event('check-transaction-notification'))
      } catch (storageError) {
        console.warn('Failed to store notification:', storageError)
      }
    }
  }
}

function handleClose() {
  showScanner.value = false
  showTextInput.value = false
  emit('close')
}

function handleTextInputEdit() {
  // When TextInputModal navigates to edit, close this parent modal too
  showTextInput.value = false
  emit('close')
}

function handleTextInputSubmit() {
  // When TextInputModal submits successfully, close this parent modal too
  showTextInput.value = false
  emit('close')
}
</script>

<template>
  <BaseModal :is-open="isOpen" title="Tambah Transaksi" size="md" @close="handleClose">
    <div class="space-y-4 py-2">
      <p class="text-sm text-slate-600 dark:text-slate-400">
        Pilih cara untuk menambahkan transaksi baru
      </p>

      <div class="space-y-3">
        <BaseCard>
          <button type="button" @click="handleAddByForm"
            class="flex w-full items-center gap-4 rounded-lg p-4 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800">
            <div class="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
              <font-awesome-icon :icon="['fas', 'edit']" class="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div class="flex-1">
              <h3 class="font-semibold text-slate-900 dark:text-slate-100">Tambah via Form</h3>
              <p class="text-sm text-slate-500 dark:text-slate-400">Masukkan detail transaksi secara manual</p>
            </div>
            <font-awesome-icon :icon="['fas', 'chevron-right']" class="text-slate-400" />
          </button>
        </BaseCard>

        <BaseCard>
          <button type="button" @click="handleAddByScan"
            class="flex w-full items-center gap-4 rounded-lg p-4 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800">
            <div class="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <font-awesome-icon :icon="['fas', 'camera']" class="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div class="flex-1">
              <h3 class="font-semibold text-slate-900 dark:text-slate-100">Scan Receipt</h3>
              <p class="text-sm text-slate-500 dark:text-slate-400">Ekstrak otomatis dari struk</p>
            </div>
            <font-awesome-icon :icon="['fas', 'chevron-right']" class="text-slate-400" />
          </button>
        </BaseCard>

        <BaseCard>
          <button type="button" @click="handleAddByText"
            class="flex w-full items-center gap-4 rounded-lg p-4 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800">
            <div class="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
              <font-awesome-icon :icon="['fas', 'keyboard']" class="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div class="flex-1">
              <h3 class="font-semibold text-slate-900 dark:text-slate-100">Input Teks</h3>
              <p class="text-sm text-slate-500 dark:text-slate-400">Ketik transaksi dalam bahasa natural</p>
            </div>
            <font-awesome-icon :icon="['fas', 'chevron-right']" class="text-slate-400" />
          </button>
        </BaseCard>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end">
        <BaseButton variant="secondary" @click="handleClose">Batal</BaseButton>
      </div>
    </template>

    <ReceiptScanner :is-open="showScanner" :categories="categories" @close="showScanner = false"
      @scan-complete="handleScanComplete" @scan-complete-multiple="handleScanCompleteMultiple" />

    <TextInputModal :is-open="showTextInput" @close="showTextInput = false" @edit-navigate="handleTextInputEdit"
      @submit-complete="handleTextInputSubmit" />
  </BaseModal>
</template>
