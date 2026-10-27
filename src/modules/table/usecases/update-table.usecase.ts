import * as tableRepository from '../repositories/table.repository'
import type { Table, TableFormValues } from '../types'
import { validateTableForm } from '../validations/table.validation'

export function updateTable(outletId: string, tableId: string, values: TableFormValues): Promise<Table> {
  return tableRepository.updateTable(outletId, tableId, validateTableForm(values))
}
