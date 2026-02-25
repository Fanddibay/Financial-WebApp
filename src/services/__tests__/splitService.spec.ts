import { describe, expect, it } from 'vitest'
import {
  computeFinalTotal,
  computeItemizedParticipantShares,
  computeParticipantAmounts,
} from '@/services/splitService'
import type { SplitItem, SplitParticipant } from '@/types/split'

describe('splitService core math', () => {
  it('computes final total with tax and service', () => {
    expect(computeFinalTotal(100_000, 11, 10)).toBe(121_000)
  })

  it('splits evenly when exclude service is false', () => {
    const participants: SplitParticipant[] = [
      { name: 'Kamu', isMe: true, amount: 0 },
      { name: 'Andi', amount: 0 },
    ]
    const finalTotal = computeFinalTotal(100_000, 11, 10)
    const result = computeParticipantAmounts(finalTotal, participants, false, 100_000, 11, 10)

    expect(result).toHaveLength(2)
    expect(result[0]?.amount).toBe(result[1]?.amount)
    expect((result[0]?.amount ?? 0) + (result[1]?.amount ?? 0)).toBe(Math.round(finalTotal))
  })

  it('itemized: splits tax and service equally when toggle is on', () => {
    const items: SplitItem[] = [
      { name: 'Nasi Goreng', price: 20_000, participant_name: 'Kamu', qty: 2, unit_price: 10_000 },
      { name: 'Es Teh', price: 10_000, participant_name: 'Andi', qty: 1, unit_price: 10_000 },
    ]
    const participantNames = [
      { name: 'Kamu', isMe: true },
      { name: 'Andi' },
    ]

    const result = computeItemizedParticipantShares(items, participantNames, 10, 10, false, true)
    const me = result.find((p) => p.isMe)
    const andi = result.find((p) => p.name === 'Andi')

    expect(result).toHaveLength(2)
    expect(me?.tax_share).toBe(andi?.tax_share)
    expect(me?.service_share).toBe(andi?.service_share)
    const sum = result.reduce((s, p) => s + p.amount, 0)
    expect(sum).toBe(36_000)
  })
})
