import type { QueryParams } from '@/lib/http'
import { listChoice, listPage, listText } from '@/lib/list-search'

import { menuStatuses, stockStatuses, type MenuListState, type StockHistoryState } from './types'

/** The menu list's state from the address bar. */
export function menuListFromUrl(search: Record<string, unknown>): MenuListState {
  return {
    q: listText(search.q),
    category_id: typeof search.category_id === 'string' && search.category_id !== '' ? search.category_id : undefined,
    status: listChoice(search.status, menuStatuses),
    stock: listChoice(search.stock, stockStatuses),
    page: listPage(search.page),
  }
}

/** The API's parameters for the menu list's state. */
export function menuListParams(state: MenuListState): QueryParams<'/outlets/{oid}/menus'> {
  return { q: state.q, category_id: state.category_id, status: state.status, stock: state.stock, page: state.page }
}

/** The stock history's page from the address bar: ?page= on the menu's page. */
export function stockHistoryFromUrl(search: Record<string, unknown>): StockHistoryState {
  return { page: listPage(search.page) }
}

/** The API's parameters for the stock history's state. */
export function stockHistoryParams(
  state: StockHistoryState,
): QueryParams<'/outlets/{oid}/menus/{mid}/stock-movements'> {
  return { page: state.page }
}
