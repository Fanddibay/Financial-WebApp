import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { RecurringTransaction, RecurringFrequency } from '@/types/recurring'
import {
  recurringService,
  isDueToday,
  getNextScheduledDate,
} from '@/services/recurringService'
import { useTransactionStore } from '@/stores/transaction'

export const useRecurringStore = defineStore('recurring', () => {
  const items = ref<RecurringTransaction[]>([])
  const loading = ref(false)
  const txStore = useTransactionStore()

  const activeItems = computed(() => items.value.filter((r) => r.is_active))

  function fetchRecurrings() {
    items.value = recurringService.getAll()
  }

  function createRecurring(data: {
    name: string
    amount: number
    type: 'income' | 'expense'
    pocket_id: string
    frequency: RecurringFrequency
    custom_interval_days?: number | null
    start_date: string
  }): RecurringTransaction {
    const created = recurringService.create(data)
    items.value = recurringService.getAll()
    return created
  }

  function updateRecurring(
    id: string,
    updates: Partial<Pick<RecurringTransaction, 'name' | 'amount' | 'type' | 'pocket_id' | 'frequency' | 'custom_interval_days' | 'start_date' | 'is_active'>>,
  ): RecurringTransaction {
    const updated = recurringService.update(id, updates)
    items.value = recurringService.getAll()
    return updated
  }

  function deleteRecurring(id: string): void {
    recurringService.delete(id)
    items.value = recurringService.getAll()
  }

  function getById(id: string): RecurringTransaction | null {
    return recurringService.getById(id)
  }

  async function processDueItems(
    onGenerated?: (name: string) => void,
  ): Promise<{ count: number; names: string[] }> {
    const result = await recurringService.processDueItems(onGenerated)
    items.value = recurringService.getAll()
    await txStore.fetchTransactions()
    return result
  }

  return {
    items,
    loading,
    activeItems,
    fetchRecurrings,
    createRecurring,
    updateRecurring,
    deleteRecurring,
    getById,
    processDueItems,
    isDueToday,
    getNextScheduledDate,
  }
})
