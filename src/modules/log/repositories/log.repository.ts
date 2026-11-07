import { apiPath, http, type Page, type QueryParams } from '@/lib/http'

import type { ActionLog } from '../types'

/** A page of every outlet's entries, newest first. */
export function listOwnerLogs(params: QueryParams<'/owner/logs'>): Promise<Page<ActionLog>> {
  return http.getPaginated<ActionLog>(apiPath('/owner/logs'), params)
}

/** A page of one outlet's entries, newest first. */
export function listOutletLogs(outletId: string, params: QueryParams<'/outlets/{oid}/logs'>): Promise<Page<ActionLog>> {
  return http.getPaginated<ActionLog>(apiPath('/outlets/{oid}/logs', { oid: outletId }), params)
}
