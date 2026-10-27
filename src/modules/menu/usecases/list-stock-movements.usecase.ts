import type { Page } from '@/lib/http'

import { stockHistoryParams } from '../filters'
import * as menuRepository from '../repositories/menu.repository'
import type { StockHistoryState, StockMovement } from '../types'

/** The page of the menu's stock history its page shows, newest first. */
export function listStockMovements(
  outletId: string,
  menuId: string,
  state: StockHistoryState,
): Promise<Page<StockMovement>> {
  return menuRepository.listStockMovements(outletId, menuId, stockHistoryParams(state))
}
