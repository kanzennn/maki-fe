import type { Me } from '@/modules/auth/types'

/**
 * Whether user manages an outlet's cashier devices: a fixed role's right
 * rather than a permission, as the API has it — the outlet's Manager, and
 * the Owner. It only hides what they can't do; the server decides.
 */
export function canManageDevices(user: Pick<Me, 'is_owner' | 'is_manager'> | null | undefined): boolean {
  return Boolean(user?.is_owner || user?.is_manager)
}
