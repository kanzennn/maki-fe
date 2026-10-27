import * as staffRepository from '../repositories/staff.repository'
import type { NewStaffValues, Staff } from '../types'
import { validateNewStaff } from '../validations/staff.validation'

/** Opens an account, a Manager or staff with a role, with a password it must change at its first sign-in. */
export function createStaff(outletId: string, values: NewStaffValues): Promise<Staff> {
  return staffRepository.createStaff(outletId, validateNewStaff(values))
}
