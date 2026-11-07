import { queryOptions } from '@tanstack/react-query'

import type { LogListState } from '@/modules/log/types'
import { listOutletLogs, listOwnerLogs } from '@/modules/log/usecases/list-logs.usecase'

export const ownerLogsQuery = (state: LogListState, timeZone: string) =>
  queryOptions({
    queryKey: ['logs', 'owner', state, timeZone] as const,
    queryFn: () => listOwnerLogs(state, timeZone),
  })

export const outletLogsQuery = (outletId: string, state: LogListState, timeZone: string) =>
  queryOptions({
    queryKey: ['logs', outletId, state, timeZone] as const,
    queryFn: () => listOutletLogs(outletId, state, timeZone),
  })
