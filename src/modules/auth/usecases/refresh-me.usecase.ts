import { sessionStore } from '@/lib/session'

import * as authRepository from '../repositories/auth.repository'

/**
 * Reloads the signed-in user — their permissions above all — after a change
 * that may have touched them, such as an edit to a role they hold.
 */
export async function refreshMe(): Promise<void> {
  sessionStore.getState().setUser(await authRepository.getMe())
}
