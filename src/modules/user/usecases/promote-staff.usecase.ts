import * as staffRepository from '../repositories/staff.repository'
import type { Staff } from '../types'

/** Makes staff the outlet's Manager, the Owner's to do: their profile as it is, and no role, a Manager's rights being fixed. */
export function promoteStaff(outletId: string, staff: Staff): Promise<Staff> {
  return staffRepository.updateStaff(outletId, staff.user_id, {
    name: staff.name,
    email: staff.email,
    phone: staff.phone,
    is_manager: true,
    role_id: null,
  })
}
