import { ValidationError } from '@/lib/validation'

import * as uploadRepository from '../repositories/upload.repository'
import type { PhotoChoice, UploadPurpose } from '../types'
import { isUploadContentType, photoProblem } from '../validations/photo.validation'

/**
 * Uploads the file and returns the key to save with: the worker makes it the
 * photo from there.
 */
export async function uploadPhoto(file: File, purpose: UploadPurpose): Promise<string> {
  const problem = photoProblem(file)
  if (problem || !isUploadContentType(file.type)) throw new ValidationError({ photo: problem ?? 'type' })
  const ticket = await uploadRepository.presignUpload(purpose, file.type, file.size)
  await uploadRepository.sendFile(ticket, file)
  return ticket.upload_key
}

/** The key of the file a form's choice holds, uploaded; none for any other choice. */
export async function uploadChosen(choice: PhotoChoice | undefined, purpose: UploadPurpose): Promise<string | undefined> {
  return choice?.file ? uploadPhoto(choice.file, purpose) : undefined
}
