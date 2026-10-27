import { z } from 'zod'

import { parseOrThrow } from '@/lib/validation'

import type { RoleFormValues, RoleInput } from '../types'

// Rules are shown from common:validation; the server's own limits.

const roleSchema = z.object({
  name: z.string().trim().min(1, 'required').max(50, 'max'),
  description: z.string().trim().max(200, 'max'),
  permissions: z.array(z.string()),
})

/** The role for the API from its form: trimmed, an empty description as none, the codes sorted. */
export function validateRoleForm(values: RoleFormValues): RoleInput {
  const v = parseOrThrow(roleSchema, values)
  return { name: v.name, description: v.description || null, permissions: [...v.permissions].sort() }
}
