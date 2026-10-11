import type { Role } from '@/shared/api/roles'
import { can, holdsAll } from '@/shared/lib/permissions'
import type { Me } from '@/shared/lib/session'

import type { Staff } from './api'

/**
 * What actor may do with target's account, by the rules the server applies
 * (it refuses anything else anyway):
 * - `view`: no user.manage;
 * - `own`: one's own account isn't managed here;
 * - `promote`: the Owner manages Managers, and may only promote staff;
 * - `managerAccount`: only the Owner manages a Manager's account;
 * - `stronger`: target holds a permission actor lacks;
 * - `manage`: everything — for the Owner on a Manager, demoting too.
 */
export type ManageMode = 'view' | 'own' | 'promote' | 'managerAccount' | 'stronger' | 'manage'

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
