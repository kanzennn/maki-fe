import { createFileRoute, redirect } from '@tanstack/react-router'

import { PageNotFound } from '@/components/shared/page-state'
import { outletQuery } from '@/hooks/outlet/outlet.queries'
import { canOpenOutlet } from '@/modules/outlet/permissions'
import { summarizeOutlet } from '@/modules/outlet/usecases/summarize-outlet.usecase'
import { orNotFound } from '@/providers/not-found'

import { OutletLayout } from './_components/outlet-layout'

// One outlet's pages, as the API scopes them: the Owner in any outlet, anyone
// else in their own. The outlet goes into the route context, so the pages
// below show its times in its time zone.
export const Route = createFileRoute('/_auth/admin/outlets/$oid')({
  beforeLoad: async ({ context, params }) => {
    const user = context.auth.user()
    if (user?.is_owner) {
      const outlet = await orNotFound(context.queryClient.ensureQueryData(outletQuery(params.oid)))
      return { outlet: summarizeOutlet(outlet) }
    }
    if (user?.outlet && canOpenOutlet(user, params.oid)) return { outlet: user.outlet }
    throw redirect({ to: '/admin' })
  },
  component: OutletLayout,
  // Here rather than at the root, so the admin area stays around it.
  notFoundComponent: PageNotFound,
})
