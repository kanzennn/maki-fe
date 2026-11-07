import { refreshMe } from '@/modules/auth/usecases/refresh-me.usecase'

import * as uploadRepository from '../repositories/upload.repository'
import { uploadPhoto } from './upload-photo.usecase'

/** Starts on the signed-in user's new photo: it shows once the worker is done, within seconds. */
export async function changeMyPhoto(file: File): Promise<void> {
  await uploadRepository.setMyPhoto(await uploadPhoto(file, 'user_photo'))
}

/** Takes the signed-in user's photo away. */
export async function removeMyPhoto(): Promise<void> {
  await uploadRepository.removeMyPhoto()
  await refreshMe()
}
