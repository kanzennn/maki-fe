import * as staffRepository from '../repositories/staff.repository'
import type { Staff, StaffStatus } from '../types'

/** Activates or deactivates an account. */
export function setStaffStatus(outletId: string, userId: string, status: StaffStatus): Promise<Staff> {
  return staffRepository.setStaffStatus(outletId, userId, status)
}
