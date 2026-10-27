import type { Page } from '@/lib/http'

import { staffListParams } from '../filters'
import * as staffRepository from '../repositories/staff.repository'
import type { Staff, StaffListState } from '../types'

/** The page of the outlet's accounts the list shows. */
export function listStaff(outletId: string, state: StaffListState): Promise<Page<Staff>> {
  return staffRepository.listStaff(outletId, staffListParams(state))
}
