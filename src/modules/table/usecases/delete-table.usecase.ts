import * as tableRepository from '../repositories/table.repository'

export function deleteTable(outletId: string, tableId: string): Promise<void> {
  return tableRepository.deleteTable(outletId, tableId)
}
