import * as tableRepository from '../repositories/table.repository'
import type { Table } from '../types'

export function setTableActive(outletId: string, tableId: string, isActive: boolean): Promise<Table> {
  return tableRepository.setTableActive(outletId, tableId, isActive)
}
