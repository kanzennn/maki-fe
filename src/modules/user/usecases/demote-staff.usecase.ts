import * as staffRepository from '../repositories/staff.repository'
import type { Staff } from '../types'
import { validateDemotion } from '../validations/staff.validation'

/** Makes a Manager staff again, with the role they take from now on. */
export function demoteStaff(outletId: string, staff: Staff, roleId: string): Promise<Staff> {
  return staffRepository.updateStaff(outletId, staff.user_id, validateDemotion(staff, roleId))
}
