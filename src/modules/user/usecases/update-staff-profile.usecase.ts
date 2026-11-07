import { uploadChosen } from '@/modules/upload/usecases/upload-photo.usecase'

import * as staffRepository from '../repositories/staff.repository'
import type { Staff, StaffProfileValues } from '../types'
import { validateStaffProfile } from '../validations/staff.validation'

/** Saves an account's profile, its photo, and a staff member's role. */
export async function updateStaffProfile(outletId: string, userId: string, values: StaffProfileValues): Promise<Staff> {
  // The fields first: a form that won't save uploads nothing.
  const body = validateStaffProfile(values)
  const uploadKey = await uploadChosen(values.photo, 'user_photo')
  return staffRepository.updateStaff(outletId, userId, { ...body, upload_key: uploadKey, remove_photo: values.photo?.removed })
}
