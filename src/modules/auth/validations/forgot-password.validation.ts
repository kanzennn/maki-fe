import { z } from 'zod'

import { parseOrThrow } from '@/lib/validation'

import type { ForgotPasswordValues } from '../types'

const forgotSchema = z.object({
  login: z.string().trim().min(1, 'required'),
})

/** The username or email, trimmed, or a ValidationError when it's empty. */
export function validateForgotPassword(values: ForgotPasswordValues): ForgotPasswordValues {
  return parseOrThrow(forgotSchema, values)
}
