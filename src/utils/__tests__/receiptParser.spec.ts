import { describe, expect, it } from 'vitest'
import { parseReceiptText, parseReceiptTextDetailed } from '@/utils/receiptParser'

describe('receiptParser smoke tests', () => {
  it('parses total amount and items from common receipt text', () => {
    const text = [
      'WARUNG MAKAN BU SARI',
      'Tanggal: 18/02/2026',
      'Nasi Goreng',
      '2 x 10.000',
      'Es Teh',
      '1 x 4.000',
      'Subtotal 24.000',
      'Total Bayar 24.000',
    ].join('\n')

    const detailed = parseReceiptTextDetailed(text)
    expect(detailed.detectedAmount).toBe(24000)
    expect(detailed.items && detailed.items.length).toBeGreaterThan(0)

    const result = parseReceiptText(text)
    const rows = Array.isArray(result) ? result : [result]
    expect(rows.length).toBeGreaterThan(0)
    const sum = rows.reduce((s, row) => s + (row.amount ?? 0), 0)
    expect(sum).toBeGreaterThan(0)
  })

  it('keeps future-dated receipt from producing future date output', () => {
    const text = [
      'TOKO ABC',
      'Tanggal: 01/01/2099',
      'Total 10.000',
    ].join('\n')

    const detailed = parseReceiptTextDetailed(text)
    expect(detailed.date).toBeTruthy()
    const parsed = new Date(detailed.date ?? '').getTime()
    expect(Number.isNaN(parsed)).toBe(false)
    expect(parsed).toBeLessThanOrEqual(Date.now())
  })
})
