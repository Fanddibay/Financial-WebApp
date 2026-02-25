import type { RecurringTransaction, RecurringFrequency } from '@/types/recurring'
import { transactionService } from '@/services/transactionService'

const STORAGE_KEY = 'financial_tracker_recurring'

function generateId(): string {
  return `recurring-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function getRecurrings(): RecurringTransaction[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    const parsed = stored ? JSON.parse(stored) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveRecurrings(items: RecurringTransaction[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

function parseDate(d: string): Date {
  const [y, m, day] = d.split('-').map(Number)
  return new Date(y!, m! - 1, day!)
}

function toDateKey(d: Date): string {
  return d.toISOString().split('T')[0]!
}

/**
 * Check if a recurring item is due today (and not yet generated today).
 */
export function isDueToday(item: RecurringTransaction): boolean {
  const today = new Date()
  const todayKey = toDateKey(today)
  const startDate = parseDate(item.start_date)

  if (startDate > today) return false
  if (!item.is_active) return false

  const lastGen = item.last_generated_at ? parseDate(item.last_generated_at) : null
  if (lastGen && toDateKey(lastGen) === todayKey) return false

  switch (item.frequency) {
    case 'daily':
      return true
    case 'weekly': {
      const msPerDay = 24 * 60 * 60 * 1000
      const daysSinceStart = Math.floor((today.getTime() - startDate.getTime()) / msPerDay)
      return daysSinceStart % 7 === 0
    }
    case 'monthly':
      return today.getDate() === startDate.getDate()
    case 'custom': {
      const interval = item.custom_interval_days ?? 1
      const msPerDay = 24 * 60 * 60 * 1000
      const daysSinceStart = Math.floor((today.getTime() - startDate.getTime()) / msPerDay)
      return daysSinceStart >= 0 && daysSinceStart % interval === 0
    }
    default:
      return false
  }
}

/**
 * Compute next scheduled date for display.
 */
export function getNextScheduledDate(item: RecurringTransaction): string {
  const today = new Date()
  const todayKey = toDateKey(today)
  const startDate = parseDate(item.start_date)

  if (!item.is_active) return todayKey

  const lastGen = item.last_generated_at ? parseDate(item.last_generated_at) : null
  const base = lastGen ?? startDate

  switch (item.frequency) {
    case 'daily': {
      const next = new Date(base)
      next.setDate(next.getDate() + 1)
      return toDateKey(next)
    }
    case 'weekly': {
      const next = new Date(base)
      next.setDate(next.getDate() + 7)
      return toDateKey(next)
    }
    case 'monthly': {
      const next = new Date(base)
      next.setMonth(next.getMonth() + 1)
      return toDateKey(next)
    }
    case 'custom': {
      const interval = item.custom_interval_days ?? 1
      const next = new Date(base)
      next.setDate(next.getDate() + interval)
      return toDateKey(next)
    }
    default:
      return todayKey
  }
}

export const recurringService = {
  getAll(): RecurringTransaction[] {
    return getRecurrings()
  },

  getById(id: string): RecurringTransaction | null {
    return getRecurrings().find((r) => r.id === id) ?? null
  },

  create(data: {
    name: string
    amount: number
    type: 'income' | 'expense'
    pocket_id: string
    frequency: RecurringFrequency
    custom_interval_days?: number | null
    start_date: string
  }): RecurringTransaction {
    const now = new Date().toISOString()
    const item: RecurringTransaction = {
      id: generateId(),
      name: data.name.trim() || 'Catatan Rutin',
      amount: data.amount,
      type: data.type,
      pocket_id: data.pocket_id,
      frequency: data.frequency,
      custom_interval_days: data.frequency === 'custom' ? (data.custom_interval_days ?? 7) : null,
      start_date: data.start_date,
      last_generated_at: null,
      is_active: true,
      created_at: now,
    }
    const list = getRecurrings()
    list.push(item)
    saveRecurrings(list)
    return item
  },

  update(id: string, updates: Partial<Pick<RecurringTransaction, 'name' | 'amount' | 'type' | 'pocket_id' | 'frequency' | 'custom_interval_days' | 'start_date' | 'is_active'>>): RecurringTransaction {
    const list = getRecurrings()
    const idx = list.findIndex((r) => r.id === id)
    if (idx === -1) throw new Error('Recurring not found')
    const existing = list[idx]!
    const updated: RecurringTransaction = {
      ...existing,
      ...updates,
      custom_interval_days:
        updates.frequency === 'custom'
          ? (updates.custom_interval_days ?? existing.custom_interval_days ?? 7)
          : null,
    }
    list[idx] = updated
    saveRecurrings(list)
    return updated
  },

  setLastGenerated(id: string, date: string): void {
    const list = getRecurrings()
    const idx = list.findIndex((r) => r.id === id)
    if (idx === -1) return
    list[idx]!.last_generated_at = date
    saveRecurrings(list)
  },

  delete(id: string): void {
    const list = getRecurrings().filter((r) => r.id !== id)
    saveRecurrings(list)
  },

  async processDueItems(
    onGenerated?: (name: string) => void,
  ): Promise<{ count: number; names: string[] }> {
    const items = getRecurrings().filter(isDueToday)
    const today = toDateKey(new Date())
    const names: string[] = []

    for (const item of items) {
      await transactionService.create({
        type: item.type,
        amount: item.amount,
        description: item.name,
        category: item.type === 'income' ? 'salary' : 'food',
        date: today,
        pocketId: item.pocket_id,
        referenceType: 'recurring',
        referenceId: item.id,
      })
      recurringService.setLastGenerated(item.id, today)
      names.push(item.name)
      onGenerated?.(item.name)
    }

    return { count: items.length, names }
  },
}
