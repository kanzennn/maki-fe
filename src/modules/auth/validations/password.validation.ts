import { z } from 'zod'

import { parseOrThrow } from '@/lib/validation'

import type { ChangePasswordValues, NewPasswordValues } from '../types'

/** The server's own rule: 8 to 128 characters, anything allowed. */
const newPassword = z.string().min(1, 'required').min(8, 'min').max(128, 'max')

const newPasswordSchema = z
  .object({ password: newPassword, confirm: z.string().min(1, 'required') })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'mismatch' })

const changePasswordSchema = z
  .object({ current: z.string().min(1, 'required'), password: newPassword, confirm: z.string().min(1, 'required') })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'mismatch' })

/** A new password typed the same twice, by the server's rule; or a ValidationError. */
export function validateNewPassword(values: NewPasswordValues): NewPasswordValues {
  return parseOrThrow(newPasswordSchema, values)
}

/** The current password, and a new one typed the same twice; or a ValidationError. */
export function validateChangePassword(values: ChangePasswordValues): ChangePasswordValues {
  return parseOrThrow(changePasswordSchema, values)
}
