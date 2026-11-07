import { createFileRoute, redirect } from '@tanstack/react-router'

import { outletDashboardQuery } from '@/hooks/dashboard/dashboard.queries'
import { dashboardFromUrl } from '@/modules/dashboard/filters'
import { canViewDashboard } from '@/modules/dashboard/permissions'

import { OutletDashboardPage } from './_components/outlet-dashboard-page'

// One outlet's dashboard, as the Owner opens it from their own. The outlet's
// own users have it on the admin area's front door.
export const Route = createFileRoute('/_auth/admin/outlets/$oid/dashboard')({
  validateSearch: dashboardFromUrl,
  beforeLoad: ({ context }) => {
    if (!canViewDashboard(context.auth.user())) throw redirect({ to: '/admin' })
  },
  loaderDeps: ({ search }) => search,
  loader: ({ context, params, deps }) =>
    context.queryClient.ensureQueryData(outletDashboardQuery(params.oid, deps, context.outlet.timezone)),
  component: OutletDashboardPage,
})
