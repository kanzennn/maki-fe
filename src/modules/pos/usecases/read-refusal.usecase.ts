import type { ApiError } from '@/lib/http'

import type { RefusalEffects, TableUnavailable } from '../types'

/**
 * What a refused order changes before the cashier charges again:
 *
 * - A voucher's refusal (`voucher_used_up`, …): the voucher comes off the
 *   order.
 * - `table_unavailable` (the table was turned off, scheduled off or deleted
 *   since it was picked): the table comes off, and the floor loads again.
 * - `dine_in_mode_changed` (the Manager changed how the outlet seats its
 *   customers): the table, or the stand's number, the way the refusal names
 *   has no place for comes off, and the catalog, which says the way, and the
 *   floor load again.
 * - Any other refusal: what it names loads again, the device or the catalog.
 */
export function refusalEffects(error: ApiError): RefusalEffects {
  const none: RefusalEffects = { dropVoucher: false, dropTable: false, dropStand: false, reload: [] }
  if (error.code.startsWith('voucher_')) return { ...none, dropVoucher: true }
  if (error.code === 'table_unavailable') return { ...none, dropTable: true, reload: ['floor'] }
  if (error.code === 'dine_in_mode_changed') {
    return {
      ...none,
      dropTable: error.details?.mode === 'number',
      dropStand: error.details?.mode === 'table',
      reload: ['catalog', 'floor'],
    }
  }
  return { ...none, reload: [error.code.startsWith('device_') ? 'device' : 'catalog'] }
}

/** Why the server refused an order's table (table_unavailable's details.status), or null for a reason it didn't give. */
export function tableUnavailable(details: Record<string, unknown> | undefined): TableUnavailable | null {
  const status = details?.status
  return status === 'inactive' || status === 'scheduled' || status === 'missing' ? status : null
}
