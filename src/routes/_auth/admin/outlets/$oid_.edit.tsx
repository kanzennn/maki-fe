import { createFileRoute, redirect } from '@tanstack/react-router'

import { outletQuery } from '@/features/outlet/api'
import { OutletEditPage } from '@/features/outlet/components/OutletEditPage'
import { PageNotFound } from '@/shared/components/PageState'
import { orNotFound } from '@/shared/lib/not-found'

// Outside the outlet's tabs: a form of its own, with the way back to them.
export const Route = createFileRoute('/_auth/admin/outlets/$oid_/edit')({
  beforeLoad: ({ context }) => {
    if (!context.auth.user()?.is_owner) throw redirect({ to: '/admin' })
  },
  loader: ({ context, params }) => orNotFound(context.queryClient.ensureQueryData(outletQuery(params.oid))),
  component: OutletEditPage,
  // Here rather than at the root, so the admin area stays around it.
  notFoundComponent: PageNotFound,
})
