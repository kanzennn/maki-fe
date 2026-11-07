import { createFileRoute, redirect } from '@tanstack/react-router'

import { navItems } from '@/components/layout/navigation'
import { outletDashboardQuery, ownerDashboardQuery } from '@/hooks/dashboard/dashboard.queries'
import { allOutletsQuery } from '@/hooks/outlet/outlet.queries'
import { browserTimeZone } from '@/lib/time'
import { dashboardFromUrl } from '@/modules/dashboard/filters'
import { canViewDashboard } from '@/modules/dashboard/permissions'

import { DashboardPage } from './_components/dashboard-page'

// The admin area's front door, where sign-in and / lead: the dashboard for
// those who may see it, otherwise the first page the user's permissions
// open — the cashier for a cashier — or, with none, a page that says so.
export const Route = createFileRoute('/_auth/admin/')({
  validateSearch: dashboardFromUrl,
  beforeLoad: ({ context }) => {
    const user = context.auth.user()
    if (canViewDashboard(user)) return
    const first = navItems(user)[0]
    throw redirect(first ? first.link : { to: '/admin/no-access' })
  },
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => {
    const user = context.auth.user()
    if (user?.outlet) {
      return context.queryClient.ensureQueryData(outletDashboardQuery(user.outlet.outlet_id, deps, user.outlet.timezone))
    }
    return Promise.all([
      context.queryClient.ensureQueryData(ownerDashboardQuery(deps, browserTimeZone())),
      context.queryClient.ensureQueryData(allOutletsQuery()),
    ])
  },
  component: DashboardPage,
})
