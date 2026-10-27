import type { Page } from '@/lib/http'

import { voucherListParams } from '../filters'
import * as voucherRepository from '../repositories/voucher.repository'
import type { Voucher, VoucherListState } from '../types'

/** The page of the vouchers an outlet's cashier can take, as its Manager sees them. */
export function listOutletVouchers(outletId: string, state: VoucherListState): Promise<Page<Voucher>> {
  return voucherRepository.listOutletVouchers(outletId, voucherListParams(state))
}
