import * as outletRepository from '../repositories/outlet.repository'
import type { Outlet, OutletStatus } from '../types'

/** Activates or deactivates the outlet; only an inactive one can be deleted. */
export function setOutletStatus(outletId: string, status: OutletStatus): Promise<Outlet> {
  return outletRepository.setOutletStatus(outletId, status)
}
