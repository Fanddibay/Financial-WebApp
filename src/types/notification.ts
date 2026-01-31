/**
 * In-app notification item (dummy data from transaction activity).
 */

export type NotificationRelativeTime = 'today' | 'yesterday' | 'this_week'

export interface NotificationItem {
  /** Unique id, e.g. date string YYYY-MM-DD */
  id: string
  /** Date string YYYY-MM-DD for filtering transactions */
  dateStr: string
  /** Human summary, e.g. "You recorded 3 transactions today" */
  summary: string
  /** Relative label: Today / Yesterday / This week */
  relativeTimeLabel: string
  /** Number of transactions on that day */
  transactionCount: number
  /** Sort order: 0 = today, 1 = yesterday, etc. */
  sortOrder: number
  /** Period type for insight copy: today | yesterday | week */
  periodType: 'today' | 'yesterday' | 'week'
}
