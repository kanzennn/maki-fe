import type { QueryParams } from '@/lib/http'
import { listChoice, listPage } from '@/lib/list-search'

import { scheduleStatuses, type ScheduleListState, type TablesState } from './types'

/** The tables page's state from the address bar: ?area= is the area shown; without one, or with one that's gone, the first. */
export function tablesFromUrl(search: Record<string, unknown>): TablesState {
  return { area: typeof search.area === 'string' && search.area !== '' ? search.area : undefined }
}

/** The schedule list's state from the address bar. */
export function scheduleListFromUrl(search: Record<string, unknown>): ScheduleListState {
  return { status: listChoice(search.status, scheduleStatuses), page: listPage(search.page) }
}

/** The API's parameters for the schedule list's state. */
export function scheduleListParams(state: ScheduleListState): QueryParams<'/outlets/{oid}/table-schedules'> {
  return { status: state.status, page: state.page }
}
