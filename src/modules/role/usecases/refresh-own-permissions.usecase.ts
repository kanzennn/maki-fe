import { sessionStore } from '@/lib/session'
import { refreshMe } from '@/modules/auth/usecases/refresh-me.usecase'

/**
 * After a role changes: staff hold a role themselves, so their own
 * permissions are reloaded. The Owner's and a Manager's are fixed.
 */
export async function refreshOwnPermissions(): Promise<void> {
  const user = sessionStore.getState().user
  if (user && !user.is_owner && !user.is_manager) await refreshMe()
}
