import type { components } from '@/lib/api-schema'

/** An account of an outlet: a Manager, or staff with a custom role. */
export type Staff = components['schemas']['Staff']
export type CreateStaffRequest = components['schemas']['CreateStaffRequest']
export type UpdateStaffRequest = components['schemas']['UpdateStaffRequest']
export type StaffStatus = Staff['status']

export const staffStatuses = ['active', 'inactive'] as const satisfies readonly StaffStatus[]

/** The user list as the page shows it: search text, status, role, page. */
export type StaffListState = { q?: string; status?: StaffStatus; role_id?: string; page?: number }

/** A new account's form, as typed: a Manager (the Owner's) or staff with a role. */
export type NewStaffValues = {
  name: string
  username: string
  email: string
  phone: string
  role_id: string
  password: string
  confirm: string
  is_manager: boolean
}

/** The fields of a new account the server's validation_failed answers name too. */
export const newStaffFields = ['name', 'username', 'email', 'phone', 'role_id'] as const satisfies readonly (keyof NewStaffValues)[]

/** An account's profile, and a staff member's role, as typed. */
export type StaffProfileValues = { name: string; email: string; phone: string; role_id: string; is_manager: boolean }

export const staffProfileFields = ['name', 'email', 'phone', 'role_id'] as const satisfies readonly (keyof StaffProfileValues)[]

/** A temporary password for an account, typed twice. */
export type TemporaryPasswordValues = { password: string; confirm: string }

/**
 * What an actor may do with an account, by the rules the server applies:
 * - `view`: no user.manage;
 * - `own`: one's own account isn't managed here;
 * - `promote`: the Owner manages Managers, and may only promote staff;
 * - `managerAccount`: only the Owner manages a Manager's account;
 * - `stronger`: the account holds a permission the actor lacks;
 * - `manage`: everything — for the Owner on a Manager, demoting too.
 */
export type ManageMode = 'view' | 'own' | 'promote' | 'managerAccount' | 'stronger' | 'manage'
