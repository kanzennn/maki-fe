import { can } from '@/modules/auth/permissions'
import type { Me } from '@/modules/auth/types'

/** Whether user sees the Log Action. It only hides what they can't see; the server decides. */
export function canViewLogs(user: Pick<Me, 'permissions'> | null | undefined): boolean {
  return can(user, 'log.view')
}
