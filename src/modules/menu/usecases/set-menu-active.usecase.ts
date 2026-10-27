import * as menuRepository from '../repositories/menu.repository'
import type { Menu } from '../types'

export function setMenuActive(outletId: string, menuId: string, active: boolean): Promise<Menu> {
  return menuRepository.setMenuActive(outletId, menuId, active)
}
