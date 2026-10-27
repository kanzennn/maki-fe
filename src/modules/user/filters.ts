import type { QueryParams } from '@/lib/http'
import { listChoice, listPage, listText } from '@/lib/list-search'

import { staffStatuses, type StaffListState } from './types'

/** The user list's state from the address bar. */
export function staffListFromUrl(search: Record<string, unknown>): StaffListState {
  return {
    q: listText(search.q),
    status: listChoice(search.status, staffStatuses),
    role_id: typeof search.role_id === 'string' && search.role_id !== '' ? search.role_id : undefined,
    page: listPage(search.page),
  }
}

/** The API's parameters for the user list's state. */
export function staffListParams(state: StaffListState): QueryParams<'/outlets/{oid}/users'> {
  return { q: state.q, status: state.status, role_id: state.role_id, page: state.page }
}
