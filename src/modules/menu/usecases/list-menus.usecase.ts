import type { Page } from '@/lib/http'

import { menuListParams } from '../filters'
import * as menuRepository from '../repositories/menu.repository'
import type { Menu, MenuListState } from '../types'

/** The page of the outlet's menus the list shows. */
export function listMenus(outletId: string, state: MenuListState): Promise<Page<Menu>> {
  return menuRepository.listMenus(outletId, menuListParams(state))
}
