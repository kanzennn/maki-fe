import type { components } from '@/lib/api-schema'

/** A role as a list or picker shows it. */
export type Role = components['schemas']['Role']
/** A role with its permissions. */
export type RoleDetail = components['schemas']['RoleDetail']
export type RoleInput = components['schemas']['RoleInput']
/** One module's permissions in the catalog. */
export type PermissionGroup = components['schemas']['PermissionGroup']
/** Every permission there is, by module: fixed in the backend's code. */
export type PermissionCatalog = components['schemas']['PermissionCatalog']

/** The role list as the page shows it: which page. */
export type RoleListState = { page?: number }

/** A role's form, as typed. */
export type RoleFormValues = { name: string; description: string; permissions: string[] }

/** The form's fields, which the server's validation_failed answers name too. */
export const roleFields = ['name', 'description', 'permissions'] as const satisfies readonly (keyof RoleFormValues)[]
