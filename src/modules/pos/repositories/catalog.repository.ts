import { apiPath, http } from '@/lib/http'

import type { PosCatalog } from '../types'

/** What the outlet's cashier sells from: its menus, stock, rates and payment methods. */
export function getCatalog(outletId: string): Promise<PosCatalog> {
  return http.get<PosCatalog>(apiPath('/outlets/{oid}/pos/catalog', { oid: outletId }))
}
