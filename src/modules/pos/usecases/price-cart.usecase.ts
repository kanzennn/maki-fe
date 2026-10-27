import type { CartItem, PosOutlet, PosVoucher, Totals } from '../types'
import { computeTotals } from './compute-totals.usecase'
import { voucherDiscount } from './voucher-discount.usecase'

/**
 * The cart's figures at the catalog's prices and the outlet's rates, its
 * voucher's discount worked out again from the voucher's terms, by the rule
 * the server checks the sale with; and whether the voucher applies yet.
 */
export function priceCart(
  items: CartItem[],
  voucher: PosVoucher | null,
  outlet: Pick<PosOutlet, 'service_bps' | 'tax_bps'>,
): { totals: Totals; voucherApplies: boolean } {
  const priced = items.map(({ line, menu }) => ({ price: menu.price, qty: line.qty }))
  const subtotal = priced.reduce((sum, line) => sum + line.price * line.qty, 0)
  const offer = voucher ? voucherDiscount(voucher, subtotal) : { discount: 0, applies: true }
  return {
    totals: computeTotals(priced, offer.discount, outlet.service_bps, outlet.tax_bps),
    voucherApplies: offer.applies,
  }
}
