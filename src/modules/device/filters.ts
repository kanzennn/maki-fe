import { listPage } from '@/lib/list-search'
import type { QueryParams } from '@/lib/http'

import type { DeviceListState } from './types'

/** The device list's state from the address bar: a page from 2, the first being the default. */
export function deviceListFromUrl(search: Record<string, unknown>): DeviceListState {
  return { page: listPage(search.page) }
}

/** The API's parameters for the device list's state. */
export function deviceListParams(state: DeviceListState): QueryParams<'/outlets/{oid}/devices'> {
  return { page: state.page }
}
