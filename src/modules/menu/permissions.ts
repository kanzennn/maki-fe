import { can } from '@/modules/auth/permissions'
import type { Me } from '@/modules/auth/types'

// These only hide what a user can't do; the server decides.

type User = Pick<Me, 'permissions'> | null | undefined

export function canViewMenus(user: User): boolean {
  return can(user, 'menu.view')
}

export function canManageMenus(user: User): boolean {
  return can(user, 'menu.manage')
}

export function canAdjustStock(user: User): boolean {
  return can(user, 'stock.adjust')
}
