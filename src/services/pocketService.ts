import type { Pocket, CreatePocketData } from '@/types/pocket'
import { DEFAULT_POCKET_COLOR } from '@/utils/pocketColors'

const STORAGE_KEY = 'financial_tracker_pockets'
export const MAIN_POCKET_ID = 'main-pocket'

function generateId(): string {
  return `pocket-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function ensureColor(p: Pocket): Pocket {
  if (p.color) return p
  return { ...p, color: DEFAULT_POCKET_COLOR }
}

function getPockets(): Pocket[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    const raw = stored ? JSON.parse(stored) : []
    const list = Array.isArray(raw) ? raw : []
    return list.map((p: Pocket) => ensureColor(p))
  } catch {
    return []
  }
}

function savePockets(pockets: Pocket[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pockets))
}

/**
 * Ensures Main Pocket exists. Call once at app init.
 * Creates it if no pockets exist; otherwise assumes it's already there.
 */
export function ensureMainPocket(): Pocket {
  const pockets = getPockets()
  const main = pockets.find((p) => p.id === MAIN_POCKET_ID || p.type === 'main')
  if (main) {
    return main
  }
  const now = new Date().toISOString()
  const mainPocket: Pocket = {
    id: MAIN_POCKET_ID,
    name: 'Main Pocket',
    icon: '💰',
    type: 'main',
    balance: 0,
    createdAt: now,
    color: DEFAULT_POCKET_COLOR,
  }
  pockets.unshift(mainPocket)
  savePockets(pockets)
  return mainPocket
}

export function getAllPockets(): Pocket[] {
  return getPockets()
}

export function getPocketById(id: string): Pocket | null {
  return getPockets().find((p) => p.id === id) ?? null
}

export function createPocket(data: CreatePocketData): Pocket {
  const pockets = getPockets()
  const now = new Date().toISOString()
  const pocket: Pocket = {
    id: generateId(),
    name: data.name.trim() || 'Unnamed',
    icon: data.icon || '📦',
    type: data.type,
    balance: 0,
    createdAt: now,
    color: data.color ?? DEFAULT_POCKET_COLOR,
  }
  pockets.push(pocket)
  savePockets(pockets)
  return pocket
}

export function updatePocket(id: string, data: Partial<Pick<Pocket, 'name' | 'icon' | 'type' | 'color'>>): Pocket {
  const pockets = getPockets()
  const idx = pockets.findIndex((p) => p.id === id)
  if (idx === -1) throw new Error(`Pocket ${id} not found`)
  const current = pockets[idx]!
  if (current.type === 'main' && data.type !== undefined && data.type !== 'main') {
    throw new Error('Cannot change Main Pocket type')
  }
  const updated: Pocket = {
    ...current,
    ...(data.name !== undefined && { name: data.name.trim() || current.name }),
    ...(data.icon !== undefined && { icon: data.icon || current.icon }),
    ...(data.type !== undefined && { type: data.type }),
    ...(data.color !== undefined && { color: data.color || DEFAULT_POCKET_COLOR }),
  }
  pockets[idx] = updated
  savePockets(pockets)
  return updated
}

export function deletePocket(id: string): void {
  if (id === MAIN_POCKET_ID) {
    throw new Error('Cannot delete Main Pocket')
  }
  const pockets = getPockets().filter((p) => p.id !== id)
  savePockets(pockets)
}
