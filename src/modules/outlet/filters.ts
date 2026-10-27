import type { QueryParams } from '@/lib/http'
import { listChoice, listPage, listText } from '@/lib/list-search'

import { outletStatuses, type OutletListState } from './types'

/** The outlet list's state from the address bar. */
export function outletListFromUrl(search: Record<string, unknown>): OutletListState {
  return { q: listText(search.q), status: listChoice(search.status, outletStatuses), page: listPage(search.page) }
}

/** The API's parameters for the outlet list's state. */
export function outletListParams(state: OutletListState): QueryParams<'/outlets'> {
  return { q: state.q, status: state.status, page: state.page }
}
