import { apiPath, http } from '@/lib/http'

import type { VoucherQuote } from '../types'

/** A voucher's terms and its discount on the subtotal, or why the sale can't take it. */
export function quoteVoucher(outletId: string, code: string, subtotal: number): Promise<VoucherQuote> {
  return http.post<VoucherQuote>(apiPath('/outlets/{oid}/vouchers/validate', { oid: outletId }), { code, subtotal })
}
