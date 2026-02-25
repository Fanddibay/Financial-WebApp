import type { Split, SplitParticipant, SplitItem } from '@/types/split'
import { transactionService } from '@/services/transactionService'

const STORAGE_KEY = 'financial_tracker_splits'

function generateId(): string {
  return `split-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function getSplits(): Split[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    const parsed = stored ? JSON.parse(stored) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveSplits(splits: Split[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(splits))
}

/**
 * Compute final total: total_bill + tax + service
 * When exclude_service_for_me: user's portion excludes their share of service
 */
export function computeFinalTotal(
  totalBill: number,
  taxPercent: number,
  servicePercent: number,
): number {
  const tax = (totalBill * taxPercent) / 100
  const service = (totalBill * servicePercent) / 100
  return totalBill + tax + service
}

/**
 * Split amount evenly across participants.
 * If exclude_service_for_me, the "me" participant gets a reduced share (no service portion).
 */
export function computeParticipantAmounts(
  finalTotal: number,
  participants: SplitParticipant[],
  excludeServiceForMe: boolean,
  totalBill: number,
  taxPercent: number,
  servicePercent: number,
): SplitParticipant[] {
  const n = participants.length
  if (n === 0) return []

  const tax = (totalBill * taxPercent) / 100
  const service = (totalBill * servicePercent) / 100
  const billPlusTax = totalBill + tax

  if (excludeServiceForMe) {
    const meIdx = participants.findIndex((p) => p.isMe)
    if (meIdx === -1) {
      return participants.map((p) => ({ ...p, amount: Math.round(finalTotal / n) }))
    }
    // Others pay: (billPlusTax + service) / n
    // Me pays: (billPlusTax / n) + (service / (n-1)) * 0... Actually spec says "exclude service from me"
    // So: Total for others = billPlusTax + service. Me pays only billPlusTax share.
    // Split bill+tax evenly, service only among others
    const billPlusTaxPerPerson = billPlusTax / n
    const servicePerOther = service / (n - 1)
    return participants.map((p) => {
      const amount = p.isMe ? billPlusTaxPerPerson : billPlusTaxPerPerson + servicePerOther
      return { ...p, amount: Math.round(amount) }
    })
  }

  const perPerson = finalTotal / n
  return participants.map((p) => ({ ...p, amount: Math.round(perPerson) }))
}

export function getMyPortion(participants: SplitParticipant[]): number {
  const me = participants.find((p) => p.isMe)
  return me?.amount ?? 0
}

/**
 * Itemized split: per-person subtotal from items, then tax & service.
 * - If splitTaxAndServiceEqually: tax and service are split equally among participants.
 * - Else: proportional to each person's subtotal share.
 * If exclude_service_for_me: user's service = 0, redistribute to others.
 * Rounding remainder goes to last participant.
 */
export function computeItemizedParticipantShares(
  items: SplitItem[],
  participantNames: { name: string; isMe?: boolean }[],
  taxPercent: number,
  servicePercent: number,
  excludeServiceForMe: boolean,
  splitTaxAndServiceEqually = false,
): SplitParticipant[] {
  const subtotal = items.reduce((s, i) => s + i.price, 0)
  if (subtotal <= 0 || participantNames.length === 0) {
    return participantNames.map((p) => ({ ...p, amount: 0, subtotal: 0, tax_share: 0, service_share: 0, total_share: 0 }))
  }

  const tax = Math.round((subtotal * taxPercent) / 100)
  const service = Math.round((subtotal * servicePercent) / 100)
  const finalTotal = subtotal + tax + service
  const n = participantNames.length

  // Per-person subtotal from items
  const subtotalByPerson: Record<string, number> = {}
  for (const p of participantNames) {
    subtotalByPerson[p.name] = 0
  }
  for (const item of items) {
    if (participantNames.some((p) => p.name === item.participant_name)) {
      subtotalByPerson[item.participant_name] = (subtotalByPerson[item.participant_name] ?? 0) + item.price
    }
  }

  const othersSubtotal = participantNames
    .filter((p) => !excludeServiceForMe || !p.isMe)
    .reduce((s, p) => s + (subtotalByPerson[p.name] ?? 0), 0)
  const serviceRecipients = excludeServiceForMe ? participantNames.filter((p) => !p.isMe) : participantNames
  const serviceN = serviceRecipients.length

  const result: SplitParticipant[] = []
  let allocated = 0

  for (let i = 0; i < participantNames.length; i++) {
    const p = participantNames[i]!
    const pSubtotal = subtotalByPerson[p.name] ?? 0
    const ratio = subtotal > 0 ? pSubtotal / subtotal : 0

    let taxShare: number
    let serviceShare: number
    if (splitTaxAndServiceEqually) {
      taxShare = i === n - 1 ? tax - Math.round((tax / n) * (n - 1)) : Math.round(tax / n)
      if (excludeServiceForMe && p.isMe) {
        serviceShare = 0
      } else {
        const idxInRecipients = serviceRecipients.findIndex((r) => r.name === p.name)
        serviceShare =
          idxInRecipients === serviceRecipients.length - 1
            ? service - Math.round((service / serviceN) * (serviceN - 1))
            : Math.round(service / serviceN)
      }
    } else {
      taxShare = Math.round(tax * ratio)
      if (excludeServiceForMe && p.isMe) {
        serviceShare = 0
      } else if (excludeServiceForMe && othersSubtotal > 0) {
        serviceShare = Math.round(service * (pSubtotal / othersSubtotal))
      } else {
        serviceShare = Math.round(service * ratio)
      }
    }

    let totalShare: number
    if (i === participantNames.length - 1) {
      totalShare = finalTotal - allocated
    } else {
      totalShare = pSubtotal + taxShare + serviceShare
      allocated += totalShare
    }

    result.push({
      name: p.name,
      isMe: p.isMe,
      amount: totalShare,
      subtotal: pSubtotal,
      tax_share: taxShare,
      service_share: serviceShare,
      total_share: totalShare,
    })
  }

  return result
}

export const splitService = {
  getAll(): Split[] {
    return getSplits()
  },

  getById(id: string): Split | null {
    return getSplits().find((s) => s.id === id) ?? null
  },

  /**
   * Create itemized split (line items).
   */
  async createItemized(
    placeName: string,
    items: SplitItem[],
    participantNames: { name: string; isMe?: boolean }[],
    taxPercent: number,
    servicePercent: number,
    excludeServiceForMe: boolean,
    pocketId: string,
    splitTaxAndServiceEqually = false,
  ): Promise<Split> {
    if (participantNames.length < 2) throw new Error('Minimum 2 participants required')
    if (items.length === 0) throw new Error('At least 1 item required')
    const subtotal = items.reduce((s, i) => s + i.price, 0)
    if (subtotal <= 0) throw new Error('Subtotal must be greater than 0')

    const computedParticipants = computeItemizedParticipantShares(
      items,
      participantNames,
      taxPercent,
      servicePercent,
      excludeServiceForMe,
      splitTaxAndServiceEqually,
    )
    const myPortion = getMyPortion(computedParticipants)
    const finalTotal = subtotal + Math.round((subtotal * taxPercent) / 100) + Math.round((subtotal * servicePercent) / 100)

    const now = new Date().toISOString()
    const today = now.split('T')[0]
    const splitId = generateId()

    const description = placeName ? `Patungan: ${placeName}` : 'Patungan'
    const transaction = await transactionService.create({
      type: 'expense',
      amount: myPortion,
      description,
      category: 'food',
      date: today,
      pocketId,
      referenceType: 'split',
      referenceId: splitId,
    })

    const split: Split = {
      id: splitId,
      place_name: placeName,
      total_bill: subtotal,
      subtotal,
      tax_percent: taxPercent,
      service_percent: servicePercent,
      exclude_service_for_me: excludeServiceForMe,
      split_tax_service_equally: splitTaxAndServiceEqually,
      participants: computedParticipants,
      items,
      my_portion: myPortion,
      final_total: finalTotal,
      expense_id: transaction.id,
      pocket_id: pocketId,
      created_at: now,
      updated_at: now,
    }

    const splits = getSplits()
    splits.push(split)
    saveSplits(splits)
    return split
  },

  async create(
    placeName: string,
    totalBill: number,
    taxPercent: number,
    servicePercent: number,
    excludeServiceForMe: boolean,
    participants: SplitParticipant[],
    pocketId: string,
  ): Promise<Split> {
    if (participants.length < 2) throw new Error('Minimum 2 participants required')
    if (totalBill <= 0) throw new Error('Total bill must be greater than 0')

    const finalTotal = computeFinalTotal(totalBill, taxPercent, servicePercent)
    const computedParticipants = computeParticipantAmounts(
      finalTotal,
      participants,
      excludeServiceForMe,
      totalBill,
      taxPercent,
      servicePercent,
    )
    const myPortion = getMyPortion(computedParticipants)

    const now = new Date().toISOString()
    const today = now.split('T')[0]
    const splitId = generateId()

    const description = placeName
      ? `Patungan: ${placeName}`
      : 'Patungan'
    const transaction = await transactionService.create({
      type: 'expense',
      amount: myPortion,
      description,
      category: 'food',
      date: today,
      pocketId,
      referenceType: 'split',
      referenceId: splitId,
    })

    const split: Split = {
      id: splitId,
      place_name: placeName,
      total_bill: totalBill,
      tax_percent: taxPercent,
      service_percent: servicePercent,
      exclude_service_for_me: excludeServiceForMe,
      participants: computedParticipants,
      my_portion: myPortion,
      expense_id: transaction.id,
      pocket_id: pocketId,
      created_at: now,
      updated_at: now,
    }

    const splits = getSplits()
    splits.push(split)
    saveSplits(splits)
    return split
  },

  async updateItemized(
    id: string,
    updates: {
      place_name?: string
      items?: SplitItem[]
      participantNames?: { name: string; isMe?: boolean }[]
      tax_percent?: number
      service_percent?: number
      exclude_service_for_me?: boolean
      split_tax_service_equally?: boolean
      pocket_id?: string
    },
  ): Promise<Split> {
    const splits = getSplits()
    const idx = splits.findIndex((s) => s.id === id)
    if (idx === -1) throw new Error('Split not found')

    const existing = splits[idx]!
    const placeName = updates.place_name ?? existing.place_name
    const items = updates.items ?? existing.items ?? []
    const participantNames = updates.participantNames ?? existing.participants.map((p) => ({ name: p.name, isMe: p.isMe }))
    const taxPercent = updates.tax_percent ?? existing.tax_percent
    const servicePercent = updates.service_percent ?? existing.service_percent
    const excludeServiceForMe = updates.exclude_service_for_me ?? existing.exclude_service_for_me
    const splitTaxAndServiceEqually = updates.split_tax_service_equally ?? existing.split_tax_service_equally ?? false
    const pocketId = updates.pocket_id ?? existing.pocket_id

    if (participantNames.length < 2) throw new Error('Minimum 2 participants required')
    if (items.length === 0) throw new Error('At least 1 item required')
    const subtotal = items.reduce((s, i) => s + i.price, 0)
    if (subtotal <= 0) throw new Error('Subtotal must be greater than 0')

    const computedParticipants = computeItemizedParticipantShares(
      items,
      participantNames,
      taxPercent,
      servicePercent,
      excludeServiceForMe,
      splitTaxAndServiceEqually,
    )
    const myPortion = getMyPortion(computedParticipants)
    const finalTotal = subtotal + Math.round((subtotal * taxPercent) / 100) + Math.round((subtotal * servicePercent) / 100)

    const updated: Split = {
      ...existing,
      place_name: placeName,
      total_bill: subtotal,
      subtotal,
      tax_percent: taxPercent,
      service_percent: servicePercent,
      exclude_service_for_me: excludeServiceForMe,
      split_tax_service_equally: splitTaxAndServiceEqually,
      participants: computedParticipants,
      items,
      my_portion: myPortion,
      final_total: finalTotal,
      pocket_id: pocketId,
      updated_at: new Date().toISOString(),
    }
    splits[idx] = updated
    saveSplits(splits)

    if (existing.expense_id) {
      await transactionService.update(existing.expense_id, {
        amount: myPortion,
        description: placeName ? `Patungan: ${placeName}` : 'Patungan',
      })
    }

    return updated
  },

  async update(
    id: string,
    updates: {
      place_name?: string
      total_bill?: number
      tax_percent?: number
      service_percent?: number
      exclude_service_for_me?: boolean
      split_tax_service_equally?: boolean
      participants?: SplitParticipant[]
      items?: SplitItem[]
      participantNames?: { name: string; isMe?: boolean }[]
      pocket_id?: string
    },
  ): Promise<Split> {
    const splits = getSplits()
    const idx = splits.findIndex((s) => s.id === id)
    if (idx === -1) throw new Error('Split not found')

    const existing = splits[idx]!
    if (existing.items && existing.items.length > 0) {
      return this.updateItemized(id, {
        place_name: updates.place_name,
        items: updates.items ?? existing.items,
        participantNames: updates.participantNames ?? existing.participants.map((p) => ({ name: p.name, isMe: p.isMe })),
        tax_percent: updates.tax_percent,
        service_percent: updates.service_percent,
        exclude_service_for_me: updates.exclude_service_for_me,
        split_tax_service_equally: updates.split_tax_service_equally,
        pocket_id: updates.pocket_id,
      })
    }

    const placeName = updates.place_name ?? existing.place_name
    const totalBill = updates.total_bill ?? existing.total_bill
    const taxPercent = updates.tax_percent ?? existing.tax_percent
    const servicePercent = updates.service_percent ?? existing.service_percent
    const excludeServiceForMe = updates.exclude_service_for_me ?? existing.exclude_service_for_me
    const participants = updates.participants ?? existing.participants

    if (participants.length < 2) throw new Error('Minimum 2 participants required')
    if (totalBill <= 0) throw new Error('Total bill must be greater than 0')

    const finalTotal = computeFinalTotal(totalBill, taxPercent, servicePercent)
    const computedParticipants = computeParticipantAmounts(
      finalTotal,
      participants,
      excludeServiceForMe,
      totalBill,
      taxPercent,
      servicePercent,
    )
    const myPortion = getMyPortion(computedParticipants)

    const updated: Split = {
      ...existing,
      place_name: placeName,
      total_bill: totalBill,
      tax_percent: taxPercent,
      service_percent: servicePercent,
      exclude_service_for_me: excludeServiceForMe,
      participants: computedParticipants,
      my_portion: myPortion,
      updated_at: new Date().toISOString(),
    }
    splits[idx] = updated
    saveSplits(splits)

    if (existing.expense_id) {
      await transactionService.update(existing.expense_id, {
        amount: myPortion,
        description: placeName ? `Patungan: ${placeName}` : 'Patungan',
      })
    }

    return updated
  },

  async delete(id: string): Promise<void> {
    const split = this.getById(id)
    if (!split) return

    if (split.expense_id) {
      await transactionService.delete(split.expense_id)
    }

    const splits = getSplits().filter((s) => s.id !== id)
    saveSplits(splits)
  },
}
