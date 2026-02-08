import type { Goal, InvestmentActivityEntry } from '@/types/goal'

const ACTIVITY_STORAGE_KEY = 'financial_tracker_goal_investment_activity'

function generateId(): string {
  return `inv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function getActivityMap(): Record<string, InvestmentActivityEntry[]> {
  try {
    const stored = localStorage.getItem(ACTIVITY_STORAGE_KEY)
    const raw = stored ? JSON.parse(stored) : {}
    return typeof raw === 'object' && raw !== null ? raw : {}
  } catch {
    return {}
  }
}

function saveActivityMap(map: Record<string, InvestmentActivityEntry[]>): void {
  localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(map))
}

export function getActivityEntries(goalId: string): InvestmentActivityEntry[] {
  const map = getActivityMap()
  return (map[goalId] ?? []).sort((a, b) => b.date.localeCompare(a.date))
}

export function appendActivityEntry(
  goalId: string,
  date: string,
  amount: number,
  label: string,
): void {
  const map = getActivityMap()
  const list = map[goalId] ?? []
  list.push({
    id: generateId(),
    goalId,
    date,
    amount,
    label,
  })
  map[goalId] = list
  saveActivityMap(map)
}

export function deleteActivityForGoal(goalId: string): void {
  const map = getActivityMap()
  delete map[goalId]
  saveActivityMap(map)
}

type TimelineEvent =
  | { type: 'deposit'; date: string; amount: number }
  | { type: 'withdrawal'; date: string; amount: number }
  | { type: 'daily_return'; date: string; amount: number }

/**
 * Derive principal and simulated return by processing timeline in chronological order.
 * Withdrawals reduce principal first, then simulated.
 */
export function computeInvestmentState(
  goalId: string,
  transactions: Array<{
    type: string
    amount: number
    date: string
    goalId?: string
    transferToGoalId?: string
    transferToPocketId?: string
  }>,
  activityEntries: InvestmentActivityEntry[],
): { principal: number; simulatedReturn: number } {
  const events: TimelineEvent[] = []

  for (const tx of transactions) {
    if (tx.goalId === goalId && tx.type === 'income') {
      events.push({ type: 'deposit', date: tx.date.split('T')[0], amount: tx.amount })
    }
    if (tx.transferToGoalId === goalId && tx.type === 'transfer') {
      events.push({ type: 'deposit', date: tx.date.split('T')[0], amount: tx.amount })
    }
    if (tx.goalId === goalId && tx.transferToPocketId && tx.type === 'transfer') {
      events.push({ type: 'withdrawal', date: tx.date.split('T')[0], amount: tx.amount })
    }
  }

  for (const a of activityEntries) {
    events.push({ type: 'daily_return', date: a.date, amount: a.amount })
  }

  events.sort((a, b) => a.date.localeCompare(b.date))

  let principal = 0
  let simulatedReturn = 0

  for (const e of events) {
    if (e.type === 'deposit') {
      principal += e.amount
    } else if (e.type === 'daily_return') {
      simulatedReturn += e.amount
    } else {
      const w = e.amount
      const fromPrincipal = Math.min(w, principal)
      const fromSimulated = w - fromPrincipal
      principal -= fromPrincipal
      simulatedReturn = Math.max(0, simulatedReturn - fromSimulated)
    }
  }

  return { principal, simulatedReturn }
}

/** Daily Return Rate = (Annual Return %) / 365 */
export function getDailyRate(annualPercent: number): number {
  return annualPercent / 100 / 365
}

/**
 * Run daily simulation from day after lastReturnCalculationDate through today.
 * Uses transactions and existing activities to get state at last date, then runs forward.
 */
export function runDailySimulation(
  goal: Goal,
  goalTransactions: Array<{
    type: string
    amount: number
    date: string
    goalId?: string
    transferToGoalId?: string
    transferToPocketId?: string
  }>,
  getActivityEntriesFn: (goalId: string) => InvestmentActivityEntry[],
  appendActivityFn: (goalId: string, date: string, amount: number, label: string) => void,
  updateGoalLastDateFn: (goalId: string, date: string) => void,
): number {
  if (goal.type !== 'investment' || goal.annualReturnPercentage == null) {
    return 0
  }
  const rate = getDailyRate(goal.annualReturnPercentage)
  if (rate <= 0) return 0

  const today = new Date().toISOString().split('T')[0]
  const last = goal.lastReturnCalculationDate ?? goal.createdAt.split('T')[0]

  const allActivities = getActivityEntriesFn(goal.id)
  const activitiesUpToLast = allActivities.filter((a) => a.date <= last)

  let principal = 0
  let simulated = 0

  const events: TimelineEvent[] = []
  for (const tx of goalTransactions) {
    if (tx.goalId === goal.id && tx.type === 'income') {
      events.push({ type: 'deposit', date: tx.date.split('T')[0], amount: tx.amount })
    }
    if (tx.transferToGoalId === goal.id && tx.type === 'transfer') {
      events.push({ type: 'deposit', date: tx.date.split('T')[0], amount: tx.amount })
    }
    if (tx.goalId === goal.id && tx.transferToPocketId && tx.type === 'transfer') {
      events.push({ type: 'withdrawal', date: tx.date.split('T')[0], amount: tx.amount })
    }
  }
  for (const a of activitiesUpToLast) {
    events.push({ type: 'daily_return', date: a.date, amount: a.amount })
  }
  events.sort((a, b) => a.date.localeCompare(b.date))

  for (const e of events) {
    if (e.type === 'deposit') principal += e.amount
    else if (e.type === 'daily_return') simulated += e.amount
    else {
      const w = e.amount
      const fromP = Math.min(w, principal)
      principal -= fromP
      simulated = Math.max(0, simulated - (w - fromP))
    }
  }

  let totalAdded = 0
  const currentDate = new Date(last)
  currentDate.setDate(currentDate.getDate() + 1)

  const todayDate = new Date(today)

  while (currentDate <= todayDate) {
    const dateStr = currentDate.toISOString().split('T')[0]
    const balance = principal + simulated
    const dailyGrowth = Math.round(balance * rate)
    if (dailyGrowth > 0) {
      appendActivityFn(goal.id, dateStr, dailyGrowth, 'Daily Investment Return')
      simulated += dailyGrowth
      totalAdded += dailyGrowth
    }
    updateGoalLastDateFn(goal.id, dateStr)
    currentDate.setDate(currentDate.getDate() + 1)
  }

  return totalAdded
}
