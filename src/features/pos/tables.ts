import type { FloorTable } from '@/shared/components/TableFloor'

/** A table the cashier can sell at: available, or occupied for another order there. */
export function selectable(table: Pick<FloorTable, 'status'>): boolean {
  return table.status === 'available' || table.status === 'occupied'
}

/** Why the server refused an order's table (table_unavailable's details.status), or null for a reason it didn't give. */
export function unavailable(details: Record<string, unknown> | undefined): 'inactive' | 'scheduled' | 'missing' | null {
  const status = details?.status
  return status === 'inactive' || status === 'scheduled' || status === 'missing' ? status : null
}
