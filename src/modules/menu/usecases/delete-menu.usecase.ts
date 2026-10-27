import * as menuRepository from '../repositories/menu.repository'

export function deleteMenu(outletId: string, menuId: string): Promise<void> {
  return menuRepository.deleteMenu(outletId, menuId)
}
