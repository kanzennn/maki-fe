import { apiBaseUrl, apiPath, http } from '@/lib/http'

import type { RealtimeTicket } from '../types'

/** A ticket for one connection to the outlet's live messages. */
export function createTicket(outletId: string): Promise<RealtimeTicket> {
  return http.post<RealtimeTicket>(apiPath('/outlets/{oid}/realtime/ticket', { oid: outletId }))
}

/** The WebSocket address the ticket opens, on the API's own host. */
export function socketUrl(outletId: string, ticket: string): string {
  const url = new URL(`${apiBaseUrl}${apiPath('/outlets/{oid}/realtime', { oid: outletId })}`)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  url.searchParams.set('ticket', ticket)
  return url.href
}
