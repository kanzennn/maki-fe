import { uploadChosen } from '@/modules/upload/usecases/upload-photo.usecase'

import * as menuRepository from '../repositories/menu.repository'
import type { Menu, MenuFormValues } from '../types'
import { validateMenuForm } from '../validations/menu.validation'

export async function createMenu(outletId: string, values: MenuFormValues): Promise<Menu> {
  // The fields first: a form that won't save uploads nothing.
  const body = validateMenuForm(values)
  const uploadKey = await uploadChosen(values.photo, 'menu_image')
  return menuRepository.createMenu(outletId, { ...body, upload_key: uploadKey })
}
