import { apiPath, http, type Page, type QueryParams } from '@/lib/http'

import type { Area, AreaInput, Layout, LayoutInput } from '../types'

/** A page of the outlet's areas, in their order. */
export function listAreas(outletId: string, params: QueryParams<'/outlets/{oid}/areas'>): Promise<Page<Area>> {
  return http.getPaginated<Area>(apiPath('/outlets/{oid}/areas', { oid: outletId }), params)
}

export function createArea(outletId: string, body: AreaInput): Promise<Area> {
  return http.post<Area>(apiPath('/outlets/{oid}/areas', { oid: outletId }), body)
}

export function updateArea(outletId: string, areaId: string, body: AreaInput): Promise<Area> {
  return http.put<Area>(apiPath('/outlets/{oid}/areas/{aid}', { oid: outletId, aid: areaId }), body)
}

/** Puts every area of the outlet in the order given. */
export function reorderAreas(outletId: string, areaIds: string[]): Promise<void> {
  return http.put(apiPath('/outlets/{oid}/areas/order', { oid: outletId }), { area_ids: areaIds })
}

/** Deletes an area that holds no table. */
export function deleteArea(outletId: string, areaId: string): Promise<void> {
  return http.delete(apiPath('/outlets/{oid}/areas/{aid}', { oid: outletId, aid: areaId }))
}

/** An area's canvas: its decorations, and its tables with their statuses. */
export function getLayout(outletId: string, areaId: string): Promise<Layout> {
  return http.get<Layout>(apiPath('/outlets/{oid}/areas/{aid}/layout', { oid: outletId, aid: areaId }))
}

/** Saves an area's whole layout, on the version it was opened on. */
export function saveLayout(outletId: string, areaId: string, body: LayoutInput): Promise<Layout> {
  return http.put<Layout>(apiPath('/outlets/{oid}/areas/{aid}/layout', { oid: outletId, aid: areaId }), body)
}
