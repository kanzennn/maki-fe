import { apiPath, http, type Page, type QueryParams } from '@/lib/http'

import type { Floor, Table, TableInput } from '../types'

/** A page of the outlet's tables, by area and then by name. */
export function listTables(outletId: string, params: QueryParams<'/outlets/{oid}/tables'>): Promise<Page<Table>> {
  return http.getPaginated<Table>(apiPath('/outlets/{oid}/tables', { oid: outletId }), params)
}

export function createTable(outletId: string, body: TableInput): Promise<Table> {
  return http.post<Table>(apiPath('/outlets/{oid}/tables', { oid: outletId }), body)
}

export function updateTable(outletId: string, tableId: string, body: TableInput): Promise<Table> {
  return http.put<Table>(apiPath('/outlets/{oid}/tables/{tid}', { oid: outletId, tid: tableId }), body)
}

export function setTableActive(outletId: string, tableId: string, isActive: boolean): Promise<Table> {
  return http.patch<Table>(apiPath('/outlets/{oid}/tables/{tid}/status', { oid: outletId, tid: tableId }), {
    is_active: isActive,
  })
}

export function deleteTable(outletId: string, tableId: string): Promise<void> {
  return http.delete(apiPath('/outlets/{oid}/tables/{tid}', { oid: outletId, tid: tableId }))
}

/** Marks the table's customers gone: it's free again. */
export function releaseTable(outletId: string, tableId: string): Promise<Table> {
  return http.post<Table>(apiPath('/outlets/{oid}/tables/{tid}/release', { oid: outletId, tid: tableId }))
}

/** The outlet's tables as the cashier picks from them. */
export function getFloor(outletId: string): Promise<Floor> {
  return http.get<Floor>(apiPath('/outlets/{oid}/pos/tables', { oid: outletId }))
}
