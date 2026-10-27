import type { Me } from '@/modules/auth/types'

// The fixed roles' rights rather than permissions, as the API has them.
// These only hide what a user can't do; the server decides.

type User = Pick<Me, 'is_owner' | 'is_manager'> | null | undefined

/** Whether user makes and changes vouchers: the Owner. */
export function canManageVouchers(user: User): boolean {
  return Boolean(user?.is_owner)
}

/** Whether user reads the vouchers an outlet's cashier can take: its Manager, and the Owner. */
export function canViewOutletVouchers(user: User): boolean {
  return Boolean(user?.is_owner || user?.is_manager)
}
