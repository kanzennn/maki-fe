import * as tableRepository from '../repositories/table.repository'
import type { Table, TableFormValues } from '../types'
import { validateTableForm } from '../validations/table.validation'

/** Adds a table to its area, not placed on the area's layout yet. */
export function createTable(outletId: string, values: TableFormValues): Promise<Table> {
  return tableRepository.createTable(outletId, validateTableForm(values))
}
