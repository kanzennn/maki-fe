import type { components } from '@/lib/api-schema'

export type Outlet = components['schemas']['Outlet']
export type OutletInput = components['schemas']['OutletInput']
/** What the pages inside an outlet need to know about it, as GET /me gives a Manager theirs. */
export type OutletSummary = components['schemas']['OutletSummary']
export type OutletStatus = Outlet['status']

export const outletStatuses = ['active', 'inactive'] as const satisfies readonly OutletStatus[]

/** The outlet list as the page shows it: search text, status, page. */
export type OutletListState = { q?: string; status?: OutletStatus; page?: number }

/** An outlet's form, as typed: percentages as written, empty fields as ''. */
export type OutletFormValues = {
  code: string
  name: string
  address: string
  phone: string
  timezone: string
  locale: 'id' | 'en'
  open_time: string
  close_time: string
  tax_pct: string
  service_pct: string
}

/** The form's fields, which the server's validation_failed answers name too. */
export const outletFields = [
  'code',
  'name',
  'address',
  'phone',
  'timezone',
  'locale',
  'open_time',
  'close_time',
  'tax_pct',
  'service_pct',
] as const satisfies readonly (keyof OutletFormValues)[]
