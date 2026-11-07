import type { components } from '@/lib/api-schema'

/** A dashboard: the Owner's, or one outlet's. */
export type Dashboard = components['schemas']['Dashboard']

/** The period and outlets a dashboard shows, as the address bar holds them. */
export type DashboardState = {
  from?: string
  to?: string
  /** The outlets the Owner picked; none is every outlet. */
  outlets?: string[]
}

/** The periods a click away. */
export const dashboardPresets = ['today', 'week', 'month30', 'thisMonth'] as const
export type DashboardPreset = (typeof dashboardPresets)[number]
