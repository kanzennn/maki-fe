import { useSession } from '@/shared/lib/session'

import { api, unwrap } from './client'

/**
 * Reloads the signed-in user — their permissions above all — after a change
 * that may have touched them, such as an edit to a role they hold.
 */
export async function refreshMe(): Promise<void> {
  useSession.getState().setUser(await unwrap(api.GET('/api/v1/me')))
}
