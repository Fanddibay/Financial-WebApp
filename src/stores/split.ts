import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Split, SplitParticipant } from '@/types/split'
import {
  splitService,
  computeFinalTotal,
  computeParticipantAmounts,
  computeItemizedParticipantShares,
  getMyPortion,
} from '@/services/splitService'
import { useTransactionStore } from '@/stores/transaction'

export const useSplitStore = defineStore('split', () => {
  const splits = ref<Split[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const txStore = useTransactionStore()

  function fetchSplits() {
    splits.value = splitService.getAll()
  }

  async function createSplitItemized(
    placeName: string,
    items: import('@/types/split').SplitItem[],
    participantNames: { name: string; isMe?: boolean }[],
    taxPercent: number,
    servicePercent: number,
    excludeServiceForMe: boolean,
    pocketId: string,
    splitTaxAndServiceEqually = false,
  ): Promise<Split> {
    loading.value = true
    error.value = null
    try {
      const split = await splitService.createItemized(
        placeName,
        items,
        participantNames,
        taxPercent,
        servicePercent,
        excludeServiceForMe,
        pocketId,
        splitTaxAndServiceEqually,
      )
      splits.value = splitService.getAll()
      await txStore.fetchTransactions()
      return split
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Gagal membuat patungan'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function createSplit(
    placeName: string,
    totalBill: number,
    taxPercent: number,
    servicePercent: number,
    excludeServiceForMe: boolean,
    participants: SplitParticipant[],
    pocketId: string,
  ): Promise<Split> {
    loading.value = true
    error.value = null
    try {
      const split = await splitService.create(
        placeName,
        totalBill,
        taxPercent,
        servicePercent,
        excludeServiceForMe,
        participants,
        pocketId,
      )
      splits.value = splitService.getAll()
      await txStore.fetchTransactions()
      return split
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Gagal membuat patungan'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateSplit(
    id: string,
    updates: {
      place_name?: string
      total_bill?: number
      tax_percent?: number
      service_percent?: number
      exclude_service_for_me?: boolean
      split_tax_service_equally?: boolean
      participants?: SplitParticipant[]
      items?: import('@/types/split').SplitItem[]
      participantNames?: { name: string; isMe?: boolean }[]
      pocket_id?: string
    },
  ): Promise<Split> {
    loading.value = true
    error.value = null
    try {
      const updated = await splitService.update(id, updates)
      splits.value = splitService.getAll()
      await txStore.fetchTransactions()
      return updated
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Gagal memperbarui patungan'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deleteSplit(id: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      await splitService.delete(id)
      splits.value = splitService.getAll()
      await txStore.fetchTransactions()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Gagal menghapus patungan'
      throw err
    } finally {
      loading.value = false
    }
  }

  function getSplitById(id: string): Split | null {
    return splitService.getById(id)
  }

  return {
    splits,
    loading,
    error,
    fetchSplits,
    createSplit,
    createSplitItemized,
    updateSplit,
    deleteSplit,
    getSplitById,
    computeFinalTotal,
    computeParticipantAmounts,
    computeItemizedParticipantShares,
    getMyPortion,
  }
})
