import * as menuRepository from '../repositories/menu.repository'
import type { Menu } from '../types'

export function getMenu(outletId: string, menuId: string): Promise<Menu> {
  return menuRepository.getMenu(outletId, menuId)
}
