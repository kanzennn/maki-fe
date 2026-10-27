import * as menuRepository from '../repositories/menu.repository'
import type { Menu, MenuFormValues } from '../types'
import { validateMenuForm } from '../validations/menu.validation'

/** Saves the menu's form over menu, as it stood when the form opened. */
export function updateMenu(outletId: string, menu: Menu, values: MenuFormValues): Promise<Menu> {
  return menuRepository.updateMenu(outletId, menu.menu_id, validateMenuForm(values, menu))
}
