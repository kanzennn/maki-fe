import { z } from 'zod'

import { parseOrThrow, ValidationError } from '@/lib/validation'

import type {
  CreateStaffRequest,
  NewStaffValues,
  Staff,
  StaffProfileValues,
  TemporaryPasswordValues,
  UpdateStaffRequest,
} from '../types'

// Rules are shown from common:validation; the server's own rules for an
// account, which it checks again.

const name = z.string().trim().min(1, 'required').max(100, 'max')
const email = z
  .string()
  .trim()
  .refine((v) => v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'email')
const phone = z.string().trim().max(32, 'max')
/** A temporary password: 8 to 128 characters, anything allowed. */
const password = z.string().min(1, 'required').min(8, 'min').max(128, 'max')

const newStaffSchema = z
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

const profileSchema = z
  .object({ name, email, phone, role_id: z.string(), is_manager: z.boolean() })
  .refine((v) => v.is_manager || v.role_id !== '', { path: ['role_id'], message: 'required' })

const temporaryPasswordSchema = z
  .object({ password, confirm: z.string().min(1, 'required') })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'mismatch' })

/** A new account for the API: trimmed, the username in lowercase, empty fields as none; a Manager has no role. */
export function validateNewStaff(values: NewStaffValues): CreateStaffRequest {
  const v = parseOrThrow(newStaffSchema, values)
  return {
    name: v.name,
    username: v.username,
    email: v.email || null,
    phone: v.phone || null,
    password: v.password,
    role_id: v.is_manager ? null : v.role_id,
    is_manager: v.is_manager,
  }
}

/** An account's profile for the API: trimmed, empty fields as none; a Manager keeps no role. */
export function validateStaffProfile(values: StaffProfileValues): UpdateStaffRequest {
  const v = parseOrThrow(profileSchema, values)
  return {
    name: v.name,
    email: v.email || null,
    phone: v.phone || null,
    is_manager: v.is_manager,
    role_id: v.is_manager ? null : v.role_id,
  }
}

/** The temporary password, typed the same twice, or a ValidationError. */
export function validateTemporaryPassword(values: TemporaryPasswordValues): string {
  return parseOrThrow(temporaryPasswordSchema, values).password
}

/** A Manager made staff again: their profile as it is, with the role they take; or a ValidationError without one. */
export function validateDemotion(staff: Pick<Staff, 'name' | 'email' | 'phone'>, roleId: string): UpdateStaffRequest {
  if (!roleId) throw new ValidationError({ role_id: 'required' })
  return { name: staff.name, email: staff.email, phone: staff.phone, is_manager: false, role_id: roleId }
}
