import { z } from 'zod'

// Messages are keys under auth:validation; the form shows t(`validation.${message}`).
// The server checks everything again and has the last word.

export const loginSchema = z.object({
  username: z.string().trim().min(1, 'required'),
  password: z.string().min(1, 'required'),
})

export const forgotSchema = z.object({
  login: z.string().trim().min(1, 'required'),
})

/** The server's own rule: 8 to 128 characters, anything allowed. */
const newPassword = z.string().min(1, 'required').min(8, 'min').max(128, 'max')

export const newPasswordSchema = z
  .object({ password: newPassword, confirm: z.string().min(1, 'required') })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'mismatch' })

export const changePasswordSchema = z
  .object({ current: z.string().min(1, 'required'), password: newPassword, confirm: z.string().min(1, 'required') })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'mismatch' })

export type LoginValues = z.infer<typeof loginSchema>
export type ForgotValues = z.infer<typeof forgotSchema>
export type NewPasswordValues = z.infer<typeof newPasswordSchema>
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>
