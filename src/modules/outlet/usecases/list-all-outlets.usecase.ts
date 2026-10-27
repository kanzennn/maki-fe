import * as outletRepository from '../repositories/outlet.repository'
import type { Outlet } from '../types'

/**
 * Every outlet of the Owner's, for a picker such as a voucher's outlets: the
 * API's largest page, which no Owner's outlets fill.
 */
export async function listAllOutlets(): Promise<Outlet[]> {
  return (await outletRepository.listOutlets({ page_size: 100 })).items
}
