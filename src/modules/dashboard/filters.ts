import type { QueryParams } from '@/lib/http'
import { listText, listTexts } from '@/lib/list-search'
import { isZonedInput, toZonedInput } from '@/lib/time'

import type { DashboardPreset, DashboardState } from './types'

const date = (value: unknown) => {
  const text = listText(value)
  return text && isZonedInput(`${text}T00:00`) ? text : undefined
}

/** A dashboard's state from the address bar. Dates left out mean today. */
export function dashboardFromUrl(search: Record<string, unknown>): DashboardState {
  return { from: date(search.from), to: date(search.to), outlets: listTexts(search.outlets) }
}

/** Today in the zone, as YYYY-MM-DD. */
export function today(timeZone: string, now: Date = new Date()): string {
  return toZonedInput(now.toISOString(), timeZone).slice(0, 10)
}

const daysBefore = (day: string, days: number) =>
  new Date(Date.parse(`${day}T00:00:00Z`) - days * 86_400_000).toISOString().slice(0, 10)

/** The dates of a preset, ending today in the zone. */
export function presetPeriod(preset: DashboardPreset, timeZone: string, now: Date = new Date()): { from: string; to: string } {
  const to = today(timeZone, now)
  switch (preset) {
    case 'today':
      return { from: to, to }
    case 'week':
      return { from: daysBefore(to, 6), to }
    case 'month30':
      return { from: daysBefore(to, 29), to }
    case 'thisMonth':
      return { from: `${to.slice(0, 8)}01`, to }
  }
}

/** The dates a state asks for: today in the zone where it names none. */
export function statePeriod(state: DashboardState, timeZone: string, now: Date = new Date()): { from: string; to: string } {
  const day = today(timeZone, now)
  return { from: state.from ?? state.to ?? day, to: state.to ?? (state.from && state.from > day ? state.from : day) }
}

/** The API's parameters for the Owner's dashboard. */
export function ownerDashboardParams(state: DashboardState, timeZone: string): QueryParams<'/owner/dashboard'> {
  return { ...statePeriod(state, timeZone), outlet_ids: state.outlets?.join(',') }
}

/** The API's parameters for an outlet's dashboard. */
export function outletDashboardParams(state: DashboardState, timeZone: string): QueryParams<'/outlets/{oid}/dashboard'> {
  return statePeriod(state, timeZone)
}
