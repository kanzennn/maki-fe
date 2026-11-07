import { getRouteApi } from '@tanstack/react-router'

import { OutletDashboard } from '@/components/dashboard/outlet-dashboard'

const route = getRouteApi('/_auth/admin/outlets/$oid/dashboard')

/** One outlet's dashboard, under the Owner's tabs for that outlet. */
export function OutletDashboardPage() {
  const { oid } = route.useParams()
  const state = route.useSearch()
  const navigate = route.useNavigate()
  const timeZone = route.useRouteContext({ select: (c) => c.outlet.timezone })
  return (
    <OutletDashboard
      outletId={oid}
      timeZone={timeZone}
      state={state}
      onFilter={(next) => void navigate({ search: (prev) => ({ ...prev, ...next }) })}
    />
  )
}
