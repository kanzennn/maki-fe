import { apiPath, http, type Page, type QueryParams } from '@/lib/http'

import type { Outlet, OutletInput, OutletStatus } from '../types'

export function listOutlets(params: QueryParams<'/outlets'>): Promise<Page<Outlet>> {
  return http.getPaginated<Outlet>(apiPath('/outlets'), params)
}

export function getOutlet(outletId: string): Promise<Outlet> {
  return http.get<Outlet>(apiPath('/outlets/{oid}', { oid: outletId }))
}

/** A new outlet, opened with its cashier role. */
export function createOutlet(body: OutletInput): Promise<Outlet> {
  return http.post<Outlet>(apiPath('/outlets'), body)
}

export function updateOutlet(outletId: string, body: OutletInput): Promise<Outlet> {
  return http.put<Outlet>(apiPath('/outlets/{oid}', { oid: outletId }), body)
}

export function setOutletStatus(outletId: string, status: OutletStatus): Promise<Outlet> {
  return http.patch<Outlet>(apiPath('/outlets/{oid}/status', { oid: outletId }), { status })
}

/** Deletes an inactive outlet; the server wants its name typed again. */
export function deleteOutlet(outletId: string, confirmName: string): Promise<void> {
  return http.delete(apiPath('/outlets/{oid}', { oid: outletId }), { confirm_name: confirmName })
}
