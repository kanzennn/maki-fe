import { can, holdsAll } from '@/modules/auth/permissions'
import type { Me } from '@/modules/auth/types'
import type { Role } from '@/modules/role/types'

import type { ManageMode, Staff } from './types'

// These only hide what a user can't do; the server applies the same rules
// (user/staff.go) and refuses anything else anyway.

export function canViewStaff(user: Pick<Me, 'permissions'> | null | undefined): boolean {
  return can(user, 'user.view')
}

export function canManageStaff(user: Pick<Me, 'permissions'> | null | undefined): boolean {
  return can(user, 'user.manage')
}

/** What actor may do with target's account (ManageMode). */
export function manageMode(actor: Me | null, target: Staff, roles: readonly Role[]): ManageMode {
  if (!actor || !can(actor, 'user.manage')) return 'view'
  if (target.user_id === actor.user_id) return 'own'
  if (actor.is_owner) return target.is_manager ? 'manage' : 'promote'
  if (target.is_manager) return 'managerAccount'
  const role = roles.find((r) => r.role_id === target.role?.role_id)
  if (role && !holdsAll(actor, role.permissions)) return 'stronger'
  return 'manage'
}

/** The roles actor may give: none holds a permission actor lacks. */
export function grantableRoles(actor: Me | null, roles: readonly Role[]): Role[] {
  return roles.filter((role) => holdsAll(actor, role.permissions))
}
