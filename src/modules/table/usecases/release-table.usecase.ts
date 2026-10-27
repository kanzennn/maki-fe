import * as tableRepository from '../repositories/table.repository'
import type { Table } from '../types'

/** Customers have left the table: it's free again. */
export function releaseTable(outletId: string, tableId: string): Promise<Table> {
  return tableRepository.releaseTable(outletId, tableId)
}
