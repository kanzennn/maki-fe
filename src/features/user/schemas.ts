import { z } from 'zod'

import type { Staff } from './api'

// Messages are rules, shown from common:validation; the server's own rules
// for an account, which it checks again.

const name = z.string().trim().min(1, 'required').max(100, 'max')
const email = z
  .string()
  .trim()
  .refine((v) => v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'email')
const phone = z.string().trim().max(32, 'max')
/** A temporary password: 8 to 128 characters, anything allowed. */
const password = z.string().min(1, 'required').min(8, 'min').max(128, 'max')

/** A new account: a Manager (the Owner's) or staff with a role. */
export const createStaffSchema = z
  .object({
    name,
    username: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9][a-z0-9._-]{2,31}$/, 'format'),
    email,
    phone,
    role_id: z.string(),
    password,
    confirm: z.string().min(1, 'required'),
    is_manager: z.boolean(),
  })
  .refine((v) => v.is_manager || v.role_id !== '', { path: ['role_id'], message: 'required' })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'mismatch' })

export type CreateStaffValues = z.infer<typeof createStaffSchema>

export const createStaffFields = [
  'name',
  'username',
  'email',
  'phone',
  'role_id',
] as const satisfies readonly (keyof CreateStaffValues)[]

/** An account's profile, and a staff member's role. */
export const profileSchema = z
  .object({ name, email, phone, role_id: z.string(), is_manager: z.boolean() })
  .refine((v) => v.is_manager || v.role_id !== '', { path: ['role_id'], message: 'required' })

export type ProfileValues = z.infer<typeof profileSchema>

export const profileFields = ['name', 'email', 'phone', 'role_id'] as const satisfies readonly (keyof ProfileValues)[]

export function profileValues(staff: Staff): ProfileValues {
  return {
    name: staff.name,
    email: staff.email ?? '',
    phone: staff.phone ?? '',
    role_id: staff.role?.role_id ?? '',
    is_manager: staff.is_manager,
  }
}

export const temporaryPasswordSchema = z
  .object({ password, confirm: z.string().min(1, 'required') })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'mismatch' })

export type TemporaryPasswordValues = z.infer<typeof temporaryPasswordSchema>

/** '' for a field left empty, which the API stores as no value. */
export function orNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}
