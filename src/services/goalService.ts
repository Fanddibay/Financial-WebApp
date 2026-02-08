import type { Goal, CreateGoalData } from '@/types/goal'
import { DEFAULT_POCKET_COLOR } from '@/utils/pocketColors'

const STORAGE_KEY = 'financial_tracker_goals'

function generateId(): string {
  return `goal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function ensureColor(g: Goal): Goal {
  if (g.color) return g
  return { ...g, color: DEFAULT_POCKET_COLOR }
}

function getGoals(): Goal[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    const raw = stored ? JSON.parse(stored) : []
    const list = Array.isArray(raw) ? raw : []
    return list.map((g: Goal) => ensureColor(g))
  } catch {
    return []
  }
}

function saveGoals(goals: Goal[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(goals))
}

export function getAllGoals(): Goal[] {
  return getGoals()
}

export function getGoalById(id: string): Goal | null {
  return getGoals().find((g) => g.id === id) ?? null
}

export function createGoal(data: CreateGoalData): Goal {
  const goals = getGoals()
  const now = new Date().toISOString()
  const today = now.split('T')[0]
  const goal: Goal = {
    id: generateId(),
    name: data.name.trim() || 'Unnamed Goal',
    icon: data.icon || '🎯',
    targetAmount: data.targetAmount,
    durationMonths: data.durationMonths,
    currentBalance: 0,
    createdAt: now,
    color: data.color ?? DEFAULT_POCKET_COLOR,
    type: data.type ?? 'saving',
    annualReturnPercentage: data.annualReturnPercentage,
    lastReturnCalculationDate: data.type === 'investment' ? today : undefined,
  }
  goals.push(goal)
  saveGoals(goals)
  return goal
}

export function updateGoal(
  id: string,
  data: Partial<Pick<Goal, 'name' | 'icon' | 'targetAmount' | 'durationMonths' | 'color' | 'lastReturnCalculationDate'>>,
): Goal {
  const goals = getGoals()
  const idx = goals.findIndex((g) => g.id === id)
  if (idx === -1) throw new Error(`Goal ${id} not found`)
  const current = goals[idx]!
  const updated: Goal = {
    ...current,
    ...(data.name !== undefined && { name: data.name.trim() || current.name }),
    ...(data.icon !== undefined && { icon: data.icon || current.icon }),
    ...(data.targetAmount !== undefined && { targetAmount: data.targetAmount }),
    ...(data.durationMonths !== undefined && { durationMonths: data.durationMonths }),
    ...(data.color !== undefined && { color: data.color || DEFAULT_POCKET_COLOR }),
    ...(data.lastReturnCalculationDate !== undefined && { lastReturnCalculationDate: data.lastReturnCalculationDate }),
  }
  goals[idx] = updated
  saveGoals(goals)
  return updated
}

export function deleteGoal(id: string): void {
  const goals = getGoals().filter((g) => g.id !== id)
  saveGoals(goals)
}

/**
 * Compute balance per goal from transactions (only income transactions with goalId).
 * Goals cannot go negative - balance is always >= 0.
 */
export function computeGoalBalances(transactions: Array<{ type: string; amount: number; goalId?: string }>): Record<string, number> {
  const bal: Record<string, number> = {}
  for (const t of transactions) {
    if (t.type === 'income' && t.goalId) {
      bal[t.goalId] = (bal[t.goalId] ?? 0) + t.amount
    }
    // Goals can only receive income, never expenses or transfers
  }
  return bal
}
