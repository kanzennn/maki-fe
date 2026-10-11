import { z } from 'zod'

import type { RoleDetail, RoleInput } from './api'

// Messages are rules, shown from common:validation; the server's own limits.

export const roleSchema = z.object({
  name: z.string().trim().min(1, 'required').max(50, 'max'),
  description: z.string().trim().max(200, 'max'),
  permissions: z.array(z.string()),
})

export type RoleValues = z.infer<typeof roleSchema>

export const roleFields = ['name', 'description', 'permissions'] as const satisfies readonly (keyof RoleValues)[]

export function roleValues(role?: RoleDetail): RoleValues {
  return {
    name: role?.name ?? '',
    description: role?.description ?? '',
    permissions: role?.permissions ?? [],
  }
}

export function toRoleInput(values: RoleValues): RoleInput {
  return {
    name: values.name.trim(),
    description: values.description.trim() || null,
    permissions: [...values.permissions].sort(),
  }
}

/**
 * The permission a code needs to be of use: managing something means seeing
 * it first (`user.manage` → `user.view`), so the checklist ticks and unticks
 * the pair together.
 */
export function viewFor(code: string): string | undefined {
  const [module, action] = code.split('.')
  return action === 'manage' ? `${module}.view` : undefined
}
