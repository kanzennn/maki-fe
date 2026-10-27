import type { Me } from '@/modules/auth/types'
import { can } from '@/modules/auth/permissions'

// These only hide what a user can't do; the server decides.

export function canViewRoles(user: Pick<Me, 'permissions'> | null | undefined): boolean {
  return can(user, 'role.view')
}

export function canManageRoles(user: Pick<Me, 'permissions'> | null | undefined): boolean {
  return can(user, 'role.manage')
}

/**
 * Whether user may tick code in a role's checklist: a permission they hold
 * themselves, or one the role had already, which can stay or go.
 */
export function canGivePermission(
  user: Pick<Me, 'permissions'> | null | undefined,
  code: string,
  roleHad: readonly string[],
): boolean {
  return Boolean(user?.permissions.includes(code)) || roleHad.includes(code)
}
