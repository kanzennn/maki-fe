import { uploadChosen } from '@/modules/upload/usecases/upload-photo.usecase'

import * as menuRepository from '../repositories/menu.repository'
import type { Menu, MenuFormValues } from '../types'
import { validateMenuForm } from '../validations/menu.validation'

/** Saves the menu's form over menu, as it stood when the form opened. */
export async function updateMenu(outletId: string, menu: Menu, values: MenuFormValues): Promise<Menu> {
  // The fields first: a form that won't save uploads nothing.
  const body = validateMenuForm(values, menu)
  const uploadKey = await uploadChosen(values.photo, 'menu_image')
  return menuRepository.updateMenu(outletId, menu.menu_id, {
    ...body,
    upload_key: uploadKey,
    remove_image: values.photo?.removed,
  })
}
