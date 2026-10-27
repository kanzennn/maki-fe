import { sessionStore } from '@/lib/session'

import * as authRepository from '../repositories/auth.repository'

/**
 * Ends the session on the server — which also clears the cookie — and
 * forgets it in this tab. Signing out works offline too: the local session
 * goes even when the server can't be reached.
 */
export async function signOut(): Promise<void> {
  try {
    await authRepository.logout()
  } catch {
    // Unreachable server: the session expires on its own.
  }
  sessionStore.getState().clear()
}
