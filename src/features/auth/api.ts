import type { QueryClient } from '@tanstack/react-query'

import { api, refreshSession, unwrap } from '@/shared/api/client'
import { useSession, type Me } from '@/shared/lib/session'

/** Signs in and keeps the session: the access token here, the refresh token in the backend's HttpOnly cookie. */
export async function signIn(username: string, password: string): Promise<Me> {
  const session = await unwrap(api.POST('/api/v1/auth/login', { body: { username, password, client: 'web' } }))
  useSession.getState().setSession(session)
  return session.user
}

/**
 * Ends the session on the server — which also clears the cookie — and
 * forgets everything this tab knew. Signing out works offline too: the
 * local session goes even when the server can't be reached.
 */
export async function signOut(queryClient: QueryClient): Promise<void> {
  try {
    await api.POST('/api/v1/auth/logout', {})
  } catch {
    // Unreachable server: the session expires on its own.
  }
  useSession.getState().clear()
  queryClient.clear()
}

/**
 * Resolves to whether the user is signed in: at once when this tab holds an
 * access token, otherwise after trying the refresh cookie — which is how a
 * reload or a new tab gets its session back.
 */
export function ensureSession(): Promise<boolean> {
  if (useSession.getState().accessToken) return Promise.resolve(true)
  return refreshSession()
}

export function forgotPassword(login: string) {
  return unwrap(api.POST('/api/v1/auth/password/forgot', { body: { login } }))
}

export function resetPassword(token: string, newPassword: string) {
  return unwrap(api.POST('/api/v1/auth/password/reset', { body: { token, new_password: newPassword } }))
}

export function verifyEmail(token: string) {
  return unwrap(api.POST('/api/v1/auth/email/verify', { body: { token } }))
}

/** Changes the password; the user's other sessions end, this one stays. */
export async function changePassword(current: string, next: string): Promise<void> {
  await unwrap(api.PUT('/api/v1/me/password', { body: { current_password: current, new_password: next } }))
  const me = await unwrap(api.GET('/api/v1/me'))
  useSession.getState().setUser(me)
}

/** Sets the user's language on every device; null follows their outlet's. */
export async function setLanguage(locale: 'id' | 'en' | null): Promise<Me> {
  const me = await unwrap(api.PATCH('/api/v1/me', { body: { locale } }))
  useSession.getState().setUser(me)
  return me
}

/**
 * Where to go after signing in. Only a path inside the app is accepted, so a
 * crafted ?redirect= can't send anyone to another site.
 */
export function safeRedirect(target: unknown): string {
  if (typeof target !== 'string' || !target.startsWith('/') || target.startsWith('//') || target.startsWith('/\\')) {
    return '/admin'
  }
  return target
}
