import * as staffRepository from '../repositories/staff.repository'
import type { Staff, StaffProfileValues } from '../types'
import { validateStaffProfile } from '../validations/staff.validation'

/** Saves an account's profile, and a staff member's role. */
export function updateStaffProfile(outletId: string, userId: string, values: StaffProfileValues): Promise<Staff> {
  return staffRepository.updateStaff(outletId, userId, validateStaffProfile(values))
}
