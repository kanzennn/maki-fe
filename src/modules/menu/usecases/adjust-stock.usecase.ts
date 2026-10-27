import * as menuRepository from '../repositories/menu.repository'
import type { AdjustmentFormValues, Menu } from '../types'
import { validateAdjustment } from '../validations/stock.validation'

/**
 * Adds to, takes from or counts the menu's stock, from the count it showed.
 * The answer is the menu as the adjustment left it; a 409
 * stock_insufficient means the count changed meanwhile.
 */
export function adjustStock(outletId: string, menu: Menu, values: AdjustmentFormValues): Promise<Menu> {
  return menuRepository.adjustStock(outletId, menu.menu_id, validateAdjustment(values, menu.stock_qty))
}
