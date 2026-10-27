import { describe, expect, it } from 'vitest'

// The backend's own file, which its Go tests read too.
import vectors from '../../../../../maki-be/api/test-vectors/voucher-discounts.json'
import type { VoucherTerms } from '../types'
import { voucherDiscount } from './voucher-discount.usecase'

describe('voucherDiscount', () => {
  it('has cases to check', () => {
    expect(vectors.cases.length).toBeGreaterThanOrEqual(10)
  })

  it.each(vectors.cases.map((c) => [c.name, c] as const))('%s', (_name, c) => {
    expect(voucherDiscount(c.voucher as VoucherTerms, c.subtotal)).toEqual(c.expected)
  })
})
