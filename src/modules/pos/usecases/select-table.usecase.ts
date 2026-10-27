import type { FloorTable } from '@/modules/table/types'

/** A table the cashier can sell at: available, or occupied for another order there. */
export function selectable(table: Pick<FloorTable, 'status'>): boolean {
  return table.status === 'available' || table.status === 'occupied'
}
