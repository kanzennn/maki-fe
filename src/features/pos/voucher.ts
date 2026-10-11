import { share } from './totals'

/** What a voucher's discount depends on, as POST …/vouchers/validate gives it. */
export type VoucherTerms = {
  type: 'percent' | 'amount'
  /** Basis points for a percentage (1000 is 10%), whole rupiah for an amount. */
  value: number
  /** A percentage's most, in rupiah; null for none. */
  max_discount: number | null
  /** The subtotal the voucher needs; null for none. */
  min_spend: number | null
}

/**
 * The server's rule (maki-be/internal/voucher/discount.go), which the
 * Android cashier follows too, and which
 * maki-be/api/test-vectors/voucher-discounts.json pins down: a percentage
 * of the subtotal, rounded to the nearest rupiah, half up, then held to its
 * maximum; an amount as it is; either never past the subtotal. A subtotal
 * short of the minimum spend gets nothing, and `applies` is false: the sale
 * can't take the voucher yet.
 */
export function voucherDiscount(terms: VoucherTerms, subtotal: number): { discount: number; applies: boolean } {
  if (terms.min_spend !== null && subtotal < terms.min_spend) return { discount: 0, applies: false }
  let discount = terms.value
  if (terms.type === 'percent') {
    discount = share(subtotal, terms.value)
    if (terms.max_discount !== null) discount = Math.min(discount, terms.max_discount)
  }
  return { discount: Math.min(discount, subtotal), applies: true }
}
