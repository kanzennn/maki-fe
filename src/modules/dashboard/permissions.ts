import { can } from '@/modules/auth/permissions'
import type { Me } from '@/modules/auth/types'

/** Whether user sees the admin area's dashboard. It only hides what they can't see; the server decides. */
export function canViewDashboard(user: Pick<Me, 'permissions'> | null | undefined): boolean {
  return can(user, 'dashboard.view')
}
