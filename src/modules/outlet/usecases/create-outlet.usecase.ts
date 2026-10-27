import * as outletRepository from '../repositories/outlet.repository'
import type { Outlet, OutletFormValues } from '../types'
import { validateOutletForm } from '../validations/outlet.validation'

/** Opens a new outlet, with its cashier role, from its form. */
export function createOutlet(values: OutletFormValues): Promise<Outlet> {
  return outletRepository.createOutlet(validateOutletForm(values))
}
