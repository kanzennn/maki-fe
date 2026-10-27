import * as menuRepository from '../repositories/menu.repository'
import type { Menu, MenuFormValues } from '../types'
import { validateMenuForm } from '../validations/menu.validation'

export function createMenu(outletId: string, values: MenuFormValues): Promise<Menu> {
  return menuRepository.createMenu(outletId, validateMenuForm(values))
}
