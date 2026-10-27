import { refreshSession } from '@/lib/http'
import { sessionStore } from '@/lib/session'

/**
 * Resolves to whether the user is signed in: at once when this tab holds an
 * access token, otherwise after trying the refresh cookie — which is how a
 * reload or a new tab gets its session back.
 */
export function ensureSession(): Promise<boolean> {
  if (sessionStore.getState().accessToken) return Promise.resolve(true)
  return refreshSession()
}
