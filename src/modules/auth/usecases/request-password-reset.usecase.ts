import * as authRepository from '../repositories/auth.repository'
import type { ForgotPasswordValues } from '../types'
import { validateForgotPassword } from '../validations/forgot-password.validation'

/**
 * Asks for a password-reset email: the Owner gets one at their verified
 * email, for their username or that email. The server answers the same
 * either way, so it tells nobody who has an account.
 */
export async function requestPasswordReset(values: ForgotPasswordValues): Promise<void> {
  const { login } = validateForgotPassword(values)
  await authRepository.forgotPassword({ login })
}
