import * as dineInModeRepository from '../repositories/dine-in-mode.repository'
import type { DineInMode } from '../types'

/** Seats the outlet's dine-in customers another way, from its next sale on. */
export function setDineInMode(outletId: string, mode: DineInMode): Promise<DineInMode> {
  return dineInModeRepository.setDineInMode(outletId, mode)
}
