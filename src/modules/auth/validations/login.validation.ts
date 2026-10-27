import { z } from 'zod'

import { parseOrThrow } from '@/lib/validation'

import type { LoginValues } from '../types'

// Rules are keys under auth:validation. The server checks everything again
// and has the last word.

const loginSchema = z.object({
  username: z.string().trim().min(1, 'required'),
  password: z.string().min(1, 'required'),
})

/** The sign-in form's values, the username trimmed, or a ValidationError naming each empty field. */
export function validateLogin(values: LoginValues): LoginValues {
  return parseOrThrow(loginSchema, values)
}
