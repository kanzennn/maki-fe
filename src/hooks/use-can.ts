import { useCallback } from 'react'

import { can, type Permission } from '@/modules/auth/permissions'
import { useSession } from './use-session'

/**
 * `can('user.manage')` for the signed-in user, so components ask for a
 * permission rather than a role by name. It hides what the user can't do;
 * the server decides what they may.
 */
export function useCan() {
  const user = useSession((s) => s.user)
  return useCallback((permission: Permission) => can(user, permission), [user])
}
