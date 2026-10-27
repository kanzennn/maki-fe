import type { Outlet, OutletSummary } from '../types'

/** What the pages inside an outlet need to know about it, as GET /me gives a Manager theirs. */
export function summarizeOutlet(outlet: Outlet): OutletSummary {
  const { outlet_id, code, name, timezone, locale } = outlet
  return { outlet_id, code, name, timezone, locale }
}
