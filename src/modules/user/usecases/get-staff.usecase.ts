import * as staffRepository from '../repositories/staff.repository'
import type { Staff } from '../types'

export function getStaff(outletId: string, userId: string): Promise<Staff> {
  return staffRepository.getStaff(outletId, userId)
}
