import { can } from '@/modules/auth/permissions'
import type { Me } from '@/modules/auth/types'

/** Whether user sees the outlet's Payment Control. It only hides what they can't do; the server decides. */
export function canManagePayments(user: Pick<Me, 'permissions'> | null | undefined): boolean {
  return can(user, 'payment.manage')
}
