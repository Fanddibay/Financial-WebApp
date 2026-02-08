import type { Pocket } from '@/types/pocket'
import type { Goal } from '@/types/goal'
import { MAIN_POCKET_ID } from '@/services/pocketService'

/**
 * License-based pocket limits.
 * Single source of truth for plan limits; easy to extend when new plans are added.
 */

export const MAX_POCKETS_BASIC = 2
export const MAX_POCKETS_PREMIUM = Infinity

/** Basic plan: 1 goal only. Premium: unlimited. */
export const MAX_GOALS_BASIC = 1
export const MAX_GOALS_PREMIUM = Infinity

export type PlanType = 'basic' | 'premium'

export function getMaxPockets(plan: PlanType): number {
  return plan === 'premium' ? MAX_POCKETS_PREMIUM : MAX_POCKETS_BASIC
}

export function getMaxGoals(plan: PlanType): number {
  return plan === 'premium' ? MAX_GOALS_PREMIUM : MAX_GOALS_BASIC
}

export function canAddPocket(isPremium: boolean, currentCount: number): boolean {
  const limit = getMaxPockets(isPremium ? 'premium' : 'basic')
  return currentCount < limit
}

export function isAtPocketLimit(isPremium: boolean, currentCount: number): boolean {
  return !canAddPocket(isPremium, currentCount)
}

export function canAddGoal(isPremium: boolean, currentCount: number): boolean {
  const limit = getMaxGoals(isPremium ? 'premium' : 'basic')
  return currentCount < limit
}

export function isAtGoalLimit(isPremium: boolean, currentCount: number): boolean {
  return !canAddGoal(isPremium, currentCount)
}

/** Main first, then rest by createdAt ascending. */
export function getSortedPockets(pockets: Pocket[]): Pocket[] {
  const main = pockets.find((p) => p.id === MAIN_POCKET_ID || p.type === 'main')
  const rest = pockets.filter((p) => p.id !== MAIN_POCKET_ID && p.type !== 'main')
  rest.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''))
  return main ? [main, ...rest] : rest
}

/** Ids of pockets that remain accessible on Basic when user has >2 pockets. First 2 (Main + next) only. */
export function getActivePocketIds(pockets: Pocket[], isPremium: boolean): Set<string> {
  const all = new Set(pockets.map((p) => p.id))
  if (isPremium || pockets.length <= MAX_POCKETS_BASIC) return all
  const sorted = getSortedPockets(pockets)
  const active = sorted.slice(0, MAX_POCKETS_BASIC).map((p) => p.id)
  return new Set(active)
}

export function isPocketDisabled(pocketId: string, pockets: Pocket[], isPremium: boolean): boolean {
  if (isPremium || pockets.length <= MAX_POCKETS_BASIC) return false
  const active = getActivePocketIds(pockets, isPremium)
  return !active.has(pocketId)
}

/** Pockets that are selectable / accessible (e.g. for Add Transaction, Move Money). */
export function getActivePockets(pockets: Pocket[], isPremium: boolean): Pocket[] {
  const sorted = getSortedPockets(pockets)
  if (isPremium || pockets.length <= MAX_POCKETS_BASIC) return sorted
  return sorted.slice(0, MAX_POCKETS_BASIC)
}

/** Goals sorted by createdAt ascending (first created = first). */
export function getSortedGoals(goals: Goal[]): Goal[] {
  return [...goals].sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''))
}

/** Ids of goals that remain accessible on Basic when user has >1 goal. Only the first (by createdAt) is active. */
export function getActiveGoalIds(goals: Goal[], isPremium: boolean): Set<string> {
  if (isPremium || goals.length <= MAX_GOALS_BASIC) return new Set(goals.map((g) => g.id))
  const sorted = getSortedGoals(goals)
  const active = sorted.slice(0, MAX_GOALS_BASIC).map((g) => g.id)
  return new Set(active)
}

export function isGoalDisabled(goalId: string, goals: Goal[], isPremium: boolean): boolean {
  if (isPremium || goals.length <= MAX_GOALS_BASIC) return false
  const active = getActiveGoalIds(goals, isPremium)
  return !active.has(goalId)
}

/** Goals that are selectable / accessible (e.g. for Add Transaction). */
export function getActiveGoals(goals: Goal[], isPremium: boolean): Goal[] {
  const sorted = getSortedGoals(goals)
  if (isPremium || goals.length <= MAX_GOALS_BASIC) return sorted
  return sorted.slice(0, MAX_GOALS_BASIC)
}

export function usePocketLimits() {
  return {
    getMaxPockets,
    getMaxGoals,
    canAddPocket,
    isAtPocketLimit,
    canAddGoal,
    isAtGoalLimit,
    getSortedPockets,
    getActivePocketIds,
    isPocketDisabled,
    getActivePockets,
    getSortedGoals,
    getActiveGoalIds,
    isGoalDisabled,
    getActiveGoals,
  }
}
