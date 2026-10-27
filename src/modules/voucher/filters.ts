import type { QueryParams } from '@/lib/http'
import { listChoice, listPage, listText } from '@/lib/list-search'

import { voucherStatuses, type RedemptionsState, type VoucherListState } from './types'

/** A voucher list's state from the address bar: the Owner's, or an outlet's. */
export function voucherListFromUrl(search: Record<string, unknown>): VoucherListState {
  return { q: listText(search.q), status: listChoice(search.status, voucherStatuses), page: listPage(search.page) }
}

/** The API's parameters for a voucher list's state. */
export function voucherListParams(state: VoucherListState): QueryParams<'/vouchers'> {
  return { q: state.q, status: state.status, page: state.page }
}

/** The page of a voucher's history from the address bar: ?page= on the voucher's page. */
export function redemptionsFromUrl(search: Record<string, unknown>): RedemptionsState {
  return { page: listPage(search.page) }
}

/** The API's parameters for a voucher's history. */
export function redemptionsParams(state: RedemptionsState): QueryParams<'/vouchers/{vid}/redemptions'> {
  return { page: state.page }
}
