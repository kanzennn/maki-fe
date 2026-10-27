import type { Page } from '@/lib/http'

import { outletListParams } from '../filters'
import * as outletRepository from '../repositories/outlet.repository'
import type { Outlet, OutletListState } from '../types'

/** The page of the Owner's outlets the list shows. */
export function listOutlets(state: OutletListState): Promise<Page<Outlet>> {
  return outletRepository.listOutlets(outletListParams(state))
}
