import * as outletRepository from '../repositories/outlet.repository'
import type { Outlet } from '../types'

export function getOutlet(outletId: string): Promise<Outlet> {
  return outletRepository.getOutlet(outletId)
}
