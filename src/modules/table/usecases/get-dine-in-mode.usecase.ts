import * as dineInModeRepository from '../repositories/dine-in-mode.repository'
import type { DineInMode } from '../types'

/** How the outlet seats its dine-in customers: at its tables, or by number stands. */
export function getDineInMode(outletId: string): Promise<DineInMode> {
  return dineInModeRepository.getDineInMode(outletId)
}
