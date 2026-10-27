import * as tableRepository from '../repositories/table.repository'
import type { Floor } from '../types'

/**
 * The outlet's tables as the cashier picks from them: its areas that hold
 * tables, their layouts, and each table's status.
 */
export function getFloor(outletId: string): Promise<Floor> {
  return tableRepository.getFloor(outletId)
}
