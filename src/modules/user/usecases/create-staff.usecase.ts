import { uploadChosen } from '@/modules/upload/usecases/upload-photo.usecase'

import * as staffRepository from '../repositories/staff.repository'
import type { NewStaffValues, Staff } from '../types'
import { validateNewStaff } from '../validations/staff.validation'

/** Opens an account, a Manager or staff with a role, with a password it must change at its first sign-in. */
export async function createStaff(outletId: string, values: NewStaffValues): Promise<Staff> {
  // The fields first: a form that won't save uploads nothing.
  const body = validateNewStaff(values)
  const uploadKey = await uploadChosen(values.photo, 'user_photo')
  return staffRepository.createStaff(outletId, { ...body, upload_key: uploadKey })
}
