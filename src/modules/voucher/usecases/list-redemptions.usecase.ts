import type { Page } from '@/lib/http'

import { redemptionsParams } from '../filters'
import * as voucherRepository from '../repositories/voucher.repository'
import type { RedemptionsState, VoucherRedemption } from '../types'

/** The page of the sales that used the voucher its page shows, newest first. */
export function listRedemptions(voucherId: string, state: RedemptionsState): Promise<Page<VoucherRedemption>> {
  return voucherRepository.listRedemptions(voucherId, redemptionsParams(state))
}
