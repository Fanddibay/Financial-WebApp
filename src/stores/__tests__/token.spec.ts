import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useTokenStore } from '@/stores/token'

describe('tokenStore split bill limit', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('allows split bill for basic when never used', () => {
    const store = useTokenStore()
    const info = store.getSplitBillUsageInfo()
    expect(info.canUse).toBe(true)
    expect(info.used).toBe(0)
    expect(info.limit).toBe(1)
    expect(info.daysRemaining).toBe(0)
  })

  it('blocks split bill after one use and reports remaining days', () => {
    const store = useTokenStore()
    store.recordSplitBillUse()

    const info = store.getSplitBillUsageInfo()
    expect(info.canUse).toBe(false)
    expect(info.used).toBe(1)
    expect(info.daysRemaining).toBeGreaterThanOrEqual(1)
    expect(info.daysRemaining).toBeLessThanOrEqual(store.SPLIT_BILL_COOLDOWN_DAYS)
  })

  it('re-allows split bill after cooldown window', () => {
    const store = useTokenStore()
    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
    store.usageState.splitBillLastUsedAt = fourDaysAgo

    const info = store.getSplitBillUsageInfo()
    expect(info.canUse).toBe(true)
    expect(info.used).toBe(0)
    expect(info.daysRemaining).toBe(0)
  })
})
