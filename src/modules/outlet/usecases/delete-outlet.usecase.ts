import * as outletRepository from '../repositories/outlet.repository'
import type { Outlet } from '../types'
import { validateOutletDeletion } from '../validations/outlet.validation'

/** Deletes an inactive outlet once its name is typed again. */
export function deleteOutlet(outlet: Pick<Outlet, 'outlet_id' | 'name'>, typedName: string): Promise<void> {
  return outletRepository.deleteOutlet(outlet.outlet_id, validateOutletDeletion(outlet, typedName))
}
