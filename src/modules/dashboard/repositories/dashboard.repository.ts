import { apiPath, http, type QueryParams } from '@/lib/http'

import type { Dashboard } from '../types'

export function getOwnerDashboard(params: QueryParams<'/owner/dashboard'>): Promise<Dashboard> {
  return http.get<Dashboard>(apiPath('/owner/dashboard'), params)
}

export function getOutletDashboard(outletId: string, params: QueryParams<'/outlets/{oid}/dashboard'>): Promise<Dashboard> {
  return http.get<Dashboard>(apiPath('/outlets/{oid}/dashboard', { oid: outletId }), params)
}
