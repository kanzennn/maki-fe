import * as staffRepository from '../repositories/staff.repository'
import type { TemporaryPasswordValues } from '../types'
import { validateTemporaryPassword } from '../validations/staff.validation'

/** Gives the account a temporary password, which it must change at its next sign-in. */
export function resetStaffPassword(outletId: string, userId: string, values: TemporaryPasswordValues): Promise<void> {
  return staffRepository.resetStaffPassword(outletId, userId, validateTemporaryPassword(values))
}
