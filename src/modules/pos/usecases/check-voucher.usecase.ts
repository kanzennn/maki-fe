import { ValidationError } from '@/lib/validation'

import * as voucherQuoteRepository from '../repositories/voucher-quote.repository'
import type { VoucherQuote } from '../types'

/**
 * Checks the code a customer gave, from this browser as one of the outlet's
 * tills: the voucher's terms and its discount on the subtotal, or why the
 * sale can't take it. Takes nothing; the sale does.
 */
export function checkVoucher(outletId: string, code: string, subtotal: number): Promise<VoucherQuote> {
  const typed = code.trim()
  if (typed === '') throw new ValidationError({ code: 'required' })
  return voucherQuoteRepository.quoteVoucher(outletId, typed, subtotal)
}
