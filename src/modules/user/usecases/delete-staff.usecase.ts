import * as staffRepository from '../repositories/staff.repository'

export function deleteStaff(outletId: string, userId: string): Promise<void> {
  return staffRepository.deleteStaff(outletId, userId)
}
