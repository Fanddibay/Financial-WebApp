import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Pocket, CreatePocketData } from '@/types/pocket'
import * as pocketService from '@/services/pocketService'
import { useTokenStore } from '@/stores/token'
import { isAtPocketLimit } from '@/composables/usePocketLimits'

export const usePocketStore = defineStore('pocket', () => {
  const pockets = ref<Pocket[]>([])

  const mainPocket = computed(() => pockets.value.find((p) => p.type === 'main' || p.id === pocketService.MAIN_POCKET_ID) ?? null)
  const otherPockets = computed(() => pockets.value.filter((p) => p.id !== pocketService.MAIN_POCKET_ID && p.type !== 'main'))

  function init() {
    pocketService.ensureMainPocket()
    pockets.value = pocketService.getAllPockets()
  }

  function fetchPockets() {
    pockets.value = pocketService.getAllPockets()
  }

  function getPocketById(id: string): Pocket | null {
    return pockets.value.find((p) => p.id === id) ?? null
  }

  function createPocket(data: CreatePocketData): Pocket {
    const tokenStore = useTokenStore()
    const atLimit = isAtPocketLimit(tokenStore.isLicenseActive, pockets.value.length)
    if (atLimit) {
      throw new Error('Pocket limit reached. Upgrade to Premium to add more pockets.')
    }
    const created = pocketService.createPocket(data)
    pockets.value = pocketService.getAllPockets()
    return created
  }

  function updatePocket(id: string, data: Partial<Pick<Pocket, 'name' | 'icon' | 'type' | 'color'>>) {
    const updated = pocketService.updatePocket(id, data)
    pockets.value = pocketService.getAllPockets()
    return updated
  }

  function deletePocket(id: string) {
    pocketService.deletePocket(id)
    pockets.value = pocketService.getAllPockets()
  }

  return {
    pockets,
    mainPocket,
    otherPockets,
    init,
    fetchPockets,
    getPocketById,
    createPocket,
    updatePocket,
    deletePocket,
  }
})
