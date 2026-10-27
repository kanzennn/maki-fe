import { sessionStore } from '@/lib/session'

import * as authRepository from '../repositories/auth.repository'
import type { ChangePasswordValues } from '../types'
import { validateChangePassword } from '../validations/password.validation'

/**
 * Changes the signed-in user's password; their other sessions end, this one
 * stays. The user is reloaded after, since a password someone else had set
 * no longer has to be changed.
 */
export async function changePassword(values: ChangePasswordValues): Promise<void> {
  const { current, password } = validateChangePassword(values)
  await authRepository.changePassword({ current_password: current, new_password: password })
  sessionStore.getState().setUser(await authRepository.getMe())
}
