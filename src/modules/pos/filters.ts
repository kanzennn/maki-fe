import type { QueryParams } from '@/lib/http'
import { listSearch } from '@/lib/list-search'

import type { OrderListState } from './types'

/** Today's orders' state from the address bar: search text, page. */
export function orderListFromUrl(search: Record<string, unknown>): OrderListState {
  return listSearch(search)
}

/** The API's parameters for today's orders' state. */
export function orderListParams(state: OrderListState): QueryParams<'/outlets/{oid}/orders'> {
  return { q: state.q, page: state.page }
}
