import { listChoice, listPage, listText, listTexts } from '@/lib/list-search'
import type { QueryParams } from '@/lib/http'
import { fromZonedInput, isZonedInput } from '@/lib/time'

import type { LogListState } from './types'

const date = (value: unknown) => {
  const text = listText(value)
  return text && isZonedInput(`${text}T00:00`) ? text : undefined
}

/** A log list's state from the address bar, where anyone can type anything. */
export function logListFromUrl(search: Record<string, unknown>): LogListState {
  return {
    from: date(search.from),
    to: date(search.to),
    actions: listTexts(search.actions),
    outlet: listText(search.outlet),
    self: listChoice(String(search.self), ['true']) ? true : undefined,
    user: listText(search.user),
    page: listPage(search.page),
  }
}

/** The day after a date, as the API's period leaves its end out. */
function nextDay(day: string): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10)
}

/** The dates as the instants they start at in the zone: the last day counts whole. */
function period(state: LogListState, timeZone: string) {
  return {
    from: state.from && fromZonedInput(`${state.from}T00:00`, timeZone),
    to: state.to && fromZonedInput(`${nextDay(state.to)}T00:00`, timeZone),
  }
}

/** The API's parameters for the Owner's list. */
export function ownerLogParams(state: LogListState, timeZone: string): QueryParams<'/owner/logs'> {
  return {
    ...period(state, timeZone),
    action: state.actions?.join(','),
    outlet_ids: state.outlet,
    self: state.self,
    page: state.page,
  }
}

/** The API's parameters for an outlet's list. */
export function outletLogParams(state: LogListState, timeZone: string): QueryParams<'/outlets/{oid}/logs'> {
  return { ...period(state, timeZone), action: state.actions?.join(','), user_id: state.user, page: state.page }
}
