import type { Page } from '@/lib/http'

import { voucherListParams } from '../filters'
import * as voucherRepository from '../repositories/voucher.repository'
import type { Voucher, VoucherListState } from '../types'

/** The page of the Owner's vouchers the list shows. */
export function listVouchers(state: VoucherListState): Promise<Page<Voucher>> {
  return voucherRepository.listVouchers(voucherListParams(state))
}
