import { can } from '@/modules/auth/permissions'
import type { Me } from '@/modules/auth/types'

// These only hide what a user can't do; the server decides.

type User = Pick<Me, 'permissions' | 'outlet_id'> | null | undefined

/** Whether user sells: charges orders, and picks their tables. */
export function canSell(user: User): boolean {
  return can(user, 'checkout.create')
}

/** Whether user voids the outlet's orders of today. */
export function canVoid(user: User): boolean {
  return can(user, 'order.void')
}

/** Whether user has the cashier: in an outlet, to sell or to void. */
export function canUsePos(user: User): boolean {
  return Boolean(user?.outlet_id) && (canSell(user) || canVoid(user))
}
