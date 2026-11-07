import { queryOptions } from '@tanstack/react-query'

import type { DashboardState } from '@/modules/dashboard/types'
import { getOutletDashboard, getOwnerDashboard } from '@/modules/dashboard/usecases/get-dashboard.usecase'

export const ownerDashboardQuery = (state: DashboardState, timeZone: string) =>
  queryOptions({
    queryKey: ['dashboard', 'owner', state, timeZone] as const,
    queryFn: () => getOwnerDashboard(state, timeZone),
  })

export const outletDashboardQuery = (outletId: string, state: DashboardState, timeZone: string) =>
  queryOptions({
    queryKey: ['dashboard', outletId, state, timeZone] as const,
    queryFn: () => getOutletDashboard(outletId, state, timeZone),
  })
