import { outletDashboardParams, ownerDashboardParams } from '../filters'
import * as dashboardRepository from '../repositories/dashboard.repository'
import type { Dashboard, DashboardState } from '../types'

export function getOwnerDashboard(state: DashboardState, timeZone: string): Promise<Dashboard> {
  return dashboardRepository.getOwnerDashboard(ownerDashboardParams(state, timeZone))
}

export function getOutletDashboard(outletId: string, state: DashboardState, timeZone: string): Promise<Dashboard> {
  return dashboardRepository.getOutletDashboard(outletId, outletDashboardParams(state, timeZone))
}
