import * as menuRepository from '../repositories/menu.repository'
import type { Menu, StockAlertFormValues } from '../types'
import { validateStockAlert } from '../validations/stock.validation'

/** Sets the count at which the menu shows as low on stock, or none. */
export function setStockAlert(outletId: string, menuId: string, values: StockAlertFormValues): Promise<Menu> {
  return menuRepository.setStockAlert(outletId, menuId, validateStockAlert(values))
}
