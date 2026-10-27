import { sessionStore } from '@/lib/session'

import * as authRepository from '../repositories/auth.repository'

/**
 * Confirms an email address with the token from the email sent to it. A
 * signed-in user is reloaded after, since the address may be their own.
 */
export async function verifyEmail(token: string): Promise<void> {
  await authRepository.verifyEmail({ token })
  if (sessionStore.getState().accessToken) sessionStore.getState().setUser(await authRepository.getMe())
}
