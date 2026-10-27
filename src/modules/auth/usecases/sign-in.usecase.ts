import { sessionStore } from '@/lib/session'

import * as authRepository from '../repositories/auth.repository'
import type { LoginValues, Me } from '../types'
import { validateLogin } from '../validations/login.validation'

/**
 * Signs in on the web and keeps the session: the access token in this tab,
 * the refresh token in the backend's HttpOnly cookie. Resolves to the user.
 */
export async function signIn(values: LoginValues): Promise<Me> {
  const { username, password } = validateLogin(values)
  const session = await authRepository.login({ username, password, client: 'web' })
  sessionStore.getState().setSession(session)
  return session.user
}
