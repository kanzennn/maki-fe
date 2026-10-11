import { createFileRoute, redirect } from '@tanstack/react-router'

import { outletQuery, outletSummary } from '@/features/outlet/api'
import { OutletLayout } from '@/features/outlet/components/OutletLayout'
import { PageNotFound } from '@/shared/components/PageState'
import { orNotFound } from '@/shared/lib/not-found'

// One outlet's pages, as the API scopes them: the Owner in any outlet, anyone
// else in their own. The outlet goes into the route context, so the pages
// below show its times in its time zone.
export const Route = createFileRoute('/_auth/admin/outlets/$oid')({
  beforeLoad: async ({ context, params }) => {
    const user = context.auth.user()
    if (user?.is_owner) {
      const outlet = await orNotFound(context.queryClient.ensureQueryData(outletQuery(params.oid)))
      return { outlet: outletSummary(outlet) }
    }
    if (user?.outlet && user.outlet.outlet_id === params.oid) return { outlet: user.outlet }
    throw redirect({ to: '/admin' })
  },
  component: OutletLayout,
  // Here rather than at the root, so the admin area stays around it.
  notFoundComponent: PageNotFound,
})
