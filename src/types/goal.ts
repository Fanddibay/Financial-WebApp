export type GoalType = 'saving' | 'investment'

export interface Goal {
  id: string
  name: string
  icon: string
  targetAmount: number
  durationMonths: number
  currentBalance: number
  createdAt: string
  /** Goal card color (hex). Optional; default from presets. */
  color?: string
  /** Default 'saving'. Only 'investment' uses return simulation. */
  type?: GoalType
  /** Estimated annual return (%). Only for investment goals. Not editable after creation (v1). */
  annualReturnPercentage?: number
  /** Last date (YYYY-MM-DD) we applied daily return. Used to run simulation from. */
  lastReturnCalculationDate?: string
}

export interface CreateGoalData {
  name: string
  icon: string
  targetAmount: number
  durationMonths: number
  color?: string
  type?: GoalType
  annualReturnPercentage?: number
}

/** Read-only entry for Investment Activity tab (daily simulated return). */
export interface InvestmentActivityEntry {
  id: string
  goalId: string
  date: string
  amount: number
  label: string
}
