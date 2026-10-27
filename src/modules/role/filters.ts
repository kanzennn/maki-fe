import type { QueryParams } from '@/lib/http'
import { listPage } from '@/lib/list-search'

import type { RoleListState } from './types'

/** The role list's state from the address bar. */
export function roleListFromUrl(search: Record<string, unknown>): RoleListState {
  return { page: listPage(search.page) }
}

/** The API's parameters for the role list's state. */
export function roleListParams(state: RoleListState): QueryParams<'/outlets/{oid}/roles'> {
  return { page: state.page }
}
