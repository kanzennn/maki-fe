import * as outletRepository from '../repositories/outlet.repository'
import type { Outlet, OutletFormValues } from '../types'
import { validateOutletForm } from '../validations/outlet.validation'

/** Saves the outlet's form over the outlet. */
export function updateOutlet(outletId: string, values: OutletFormValues): Promise<Outlet> {
  return outletRepository.updateOutlet(outletId, validateOutletForm(values))
}
