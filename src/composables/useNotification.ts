/**
 * Local notification logic for transaction activity.
 * Uses Web Notifications API. No backend. Fully offline.
 */

import { useProfileStore } from '@/stores/profile'
import { useNotificationStore } from '@/stores/notification'
import { useTransactionStore } from '@/stores/transaction'
import { useI18n } from 'vue-i18n'
import type { Transaction } from '@/types/transaction'
import type { NotificationFrequency } from '@/stores/profile'
import type { NotificationItem } from '@/types/notification'

const STORAGE_KEY_LAST_NOTIFIED = 'fanplanner_last_notified'
const STORAGE_KEY_PENDING_PERIOD = 'fanplanner_notification_pending_period'

export type NotificationPeriod = 'today' | 'week' | 'month' | { type: 'custom'; days: number }

export interface TransactionPeriodInfo {
  transactions: Transaction[]
  period: NotificationPeriod
  subtitleKey: string
  subtitleParams?: Record<string, number>
}

function getPeriodBounds(period: NotificationPeriod): { start: Date; end: Date } {
  const now = new Date()
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
  let start: Date

  if (period === 'today') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
  } else if (period === 'week') {
    const d = new Date(now)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday
    start = new Date(d.setDate(diff))
    start.setHours(0, 0, 0, 0)
  } else if (period === 'month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)
  } else {
    start = new Date(now)
    start.setDate(start.getDate() - period.days)
    start.setHours(0, 0, 0, 0)
  }

  return { start, end }
}

function getTransactionsInPeriod(transactions: Transaction[], period: NotificationPeriod): Transaction[] {
  const { start, end } = getPeriodBounds(period)
  return transactions.filter((t) => {
    const d = new Date(t.date)
    return d >= start && d <= end
  })
}

export function getNotificationPeriod(profile: { notificationFrequency: NotificationFrequency; notificationCustomDays: number }): NotificationPeriod {
  switch (profile.notificationFrequency) {
    case 'daily':
      return 'today'
    case 'weekly':
      return 'week'
    case 'monthly':
      return 'month'
    case 'custom':
      return { type: 'custom', days: Math.max(1, Math.min(365, profile.notificationCustomDays)) }
    default:
      return 'today'
  }
}

export function getTransactionPeriodInfo(transactions: Transaction[], period: NotificationPeriod): TransactionPeriodInfo {
  const list = getTransactionsInPeriod(transactions, period)
  if (period === 'today') {
    return { transactions: list, period: 'today', subtitleKey: 'notificationHistory.today' }
  }
  if (period === 'week') {
    return { transactions: list, period: 'week', subtitleKey: 'notificationHistory.thisWeek' }
  }
  if (period === 'month') {
    return { transactions: list, period: 'month', subtitleKey: 'notificationHistory.thisMonth' }
  }
  return {
    transactions: list,
    period,
    subtitleKey: 'notificationHistory.lastXDays',
    subtitleParams: { days: period.days },
  }
}

/** Get transactions for a single calendar day (YYYY-MM-DD). */
export function getTransactionsForDate(transactions: Transaction[], dateStr: string): Transaction[] {
  const [y, m, d] = dateStr.split('-').map(Number)
  const start = new Date(y, m - 1, d, 0, 0, 0)
  const end = new Date(y, m - 1, d, 23, 59, 59)
  return transactions.filter((t) => {
    const date = new Date(t.date)
    return date >= start && date <= end
  })
}

type TFunction = (key: string, params?: Record<string, number>) => string

/** Build dummy notification items from transactions (last 7 days). Excludes deleted. */
export function buildDummyNotificationItems(
  transactions: Transaction[],
  t: TFunction,
  isDeleted: (id: string) => boolean
): NotificationItem[] {
  const today = new Date()
  const items: NotificationItem[] = []

  for (let i = 0; i < 7; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    if (isDeleted(dateStr)) continue

    const dayTx = getTransactionsForDate(transactions, dateStr)
    if (dayTx.length === 0) continue

    const count = dayTx.length
    let summary: string
    let relativeTimeLabel: string
    if (i === 0) {
      summary = count === 1 ? t('notificationCenter.itemSummaryTodayOne') : t('notificationCenter.itemSummaryToday', { count })
      relativeTimeLabel = t('notificationCenter.relativeToday')
    } else if (i === 1) {
      summary = count === 1 ? t('notificationCenter.itemSummaryYesterdayOne') : t('notificationCenter.itemSummaryYesterday', { count })
      relativeTimeLabel = t('notificationCenter.relativeYesterday')
    } else {
      summary = count === 1 ? t('notificationCenter.itemSummaryThisWeekOne') : t('notificationCenter.itemSummaryThisWeek', { count })
      relativeTimeLabel = t('notificationCenter.relativeThisWeek')
    }

    items.push({
      id: dateStr,
      dateStr,
      summary,
      relativeTimeLabel,
      transactionCount: count,
      sortOrder: i,
      periodType: i === 0 ? 'today' : i === 1 ? 'yesterday' : 'week',
    })
  }

  // Fallback: jika tidak ada notifikasi (semua dihapus atau tidak ada transaksi 7 hari)
  // tapi user punya transaksi, tampilkan 1 dummy untuk hari ini
  if (items.length === 0 && transactions.length > 0) {
    const todayStr = today.toISOString().slice(0, 10)
    const todayCount = getTransactionsForDate(transactions, todayStr).length
    const count = todayCount || 1
    items.push({
      id: todayStr,
      dateStr: todayStr,
      summary: count === 1 ? t('notificationCenter.itemSummaryTodayOne') : t('notificationCenter.itemSummaryToday', { count }),
      relativeTimeLabel: t('notificationCenter.relativeToday'),
      transactionCount: count,
      sortOrder: 0,
      periodType: 'today',
    })
  }

  return items.sort((a, b) => a.sortOrder - b.sortOrder)
}

function getLastNotifiedKey(period: NotificationPeriod): string {
  if (period === 'today') return `${STORAGE_KEY_LAST_NOTIFIED}_today`
  if (period === 'week') return `${STORAGE_KEY_LAST_NOTIFIED}_week`
  if (period === 'month') return `${STORAGE_KEY_LAST_NOTIFIED}_month`
  return `${STORAGE_KEY_LAST_NOTIFIED}_custom_${period.days}`
}

function getPeriodDateKey(period: NotificationPeriod): string {
  if (period === 'today') return new Date().toISOString().slice(0, 10)
  if (period === 'week') {
    const d = new Date()
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    const mon = new Date(d.setDate(diff))
    return mon.toISOString().slice(0, 10)
  }
  if (period === 'month') return `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  return `${period.days}d`
}

function wasAlreadyNotified(period: NotificationPeriod): boolean {
  try {
    const key = getLastNotifiedKey(period)
    const periodKey = getPeriodDateKey(period)
    const stored = localStorage.getItem(key)
    return stored === periodKey
  } catch {
    return false
  }
}

function markNotified(period: NotificationPeriod): void {
  try {
    const key = getLastNotifiedKey(period)
    const periodKey = getPeriodDateKey(period)
    localStorage.setItem(key, periodKey)
  } catch {
    // ignore
  }
}

function getNotificationMessage(count: number, period: NotificationPeriod, t: (key: string, params?: Record<string, number>) => string): string {
  if (count === 1) {
    if (period === 'today') return t('notificationMsg.todayOne')
    if (period === 'week') return t('notificationMsg.weekOne')
    if (period === 'month') return t('notificationMsg.monthOne')
    return t('notificationMsg.customOne', { days: period.days })
  }
  if (period === 'today') return t('notificationMsg.today', { count })
  if (period === 'week') return t('notificationMsg.week', { count })
  if (period === 'month') return t('notificationMsg.month', { count })
  return t('notificationMsg.custom', { count, days: period.days })
}

export function setPendingNotificationPeriod(period: NotificationPeriod | null): void {
  try {
    if (period === null) {
      localStorage.removeItem(STORAGE_KEY_PENDING_PERIOD)
    } else {
      localStorage.setItem(STORAGE_KEY_PENDING_PERIOD, JSON.stringify(period))
    }
  } catch {
    // ignore
  }
}

export function getPendingNotificationPeriod(): NotificationPeriod | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_PENDING_PERIOD)
    if (!stored) return null
    const parsed = JSON.parse(stored)
    if (parsed === 'today' || parsed === 'week' || parsed === 'month') return parsed
    if (parsed?.type === 'custom' && typeof parsed.days === 'number') return parsed
    return null
  } catch {
    return null
  }
}

export function useNotification() {
  const profileStore = useProfileStore()
  const transactionStore = useTransactionStore()
  const notificationStore = useNotificationStore()
  const { t } = useI18n()

  function checkAndFireNotification(): void {
    if (!profileStore.profile.notificationsEnabled) return
    if (!('Notification' in window)) return
    if (Notification.permission !== 'granted') return

    const period = getNotificationPeriod(profileStore.profile)
    const info = getTransactionPeriodInfo(transactionStore.transactions, period)

    if (info.transactions.length < 1) return
    if (wasAlreadyNotified(period)) return

    const message = getNotificationMessage(info.transactions.length, period, t)
    const notification = new Notification('Fanplanner', {
      body: message,
      icon: '/ico.svg',
      tag: `fanplanner-${getPeriodDateKey(period)}`,
    })

    markNotified(period)
    setPendingNotificationPeriod(period)

    notification.onclick = () => {
      window.focus()
      notification.close()
      openHistorySheet(period)
    }
  }

  function openHistorySheet(period?: NotificationPeriod | null): void {
    const pending = getPendingNotificationPeriod()
    const p = period ?? pending ?? getNotificationPeriod(profileStore.profile)
    notificationStore.openHistorySheet(p)
    if (pending) setPendingNotificationPeriod(null)
  }

  function closeHistorySheet(): void {
    notificationStore.closeHistorySheet()
  }

  async function requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) return 'denied'
    if (Notification.permission === 'granted') return 'granted'
    if (Notification.permission === 'denied') return 'denied'
    return await Notification.requestPermission()
  }

  return {
    showHistorySheet: notificationStore.showHistorySheet,
    historyPeriod: notificationStore.historyPeriod,
    checkAndFireNotification,
    openHistorySheet,
    closeHistorySheet,
    requestPermission,
    getTransactionPeriodInfo,
    getNotificationPeriod,
  }
}
