import { can } from '@/modules/auth/permissions'
import type { Me } from '@/modules/auth/types'

// These only hide what a user can't do; the server decides.

type User = Pick<Me, 'permissions'> | null | undefined

/** Whether user sees the outlet's areas, tables, layouts and schedules. */
export function canViewTables(user: User): boolean {
  return can(user, 'table.view')
}

/** Whether user changes them: the areas, tables, layouts, schedules and the dine-in mode. */
export function canManageTables(user: User): boolean {
  return can(user, 'table.manage')
}
