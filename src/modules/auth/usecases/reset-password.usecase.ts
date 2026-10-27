import * as authRepository from '../repositories/auth.repository'
import type { NewPasswordValues } from '../types'
import { validateNewPassword } from '../validations/password.validation'

/** Sets a new password with the token from the reset email. */
export async function resetPassword(token: string, values: NewPasswordValues): Promise<void> {
  const { password } = validateNewPassword(values)
  await authRepository.resetPassword({ token, new_password: password })
}
