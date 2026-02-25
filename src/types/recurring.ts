export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'custom'

export interface RecurringTransaction {
  id: string
  name: string
  amount: number
  type: 'income' | 'expense'
  pocket_id: string
  frequency: RecurringFrequency
  custom_interval_days: number | null
  start_date: string
  last_generated_at: string | null
  is_active: boolean
  created_at: string
}
