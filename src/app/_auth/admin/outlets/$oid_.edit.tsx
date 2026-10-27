import { createFileRoute, redirect } from '@tanstack/react-router'

import { outletQuery } from '@/hooks/outlet/outlet.queries'
import { canManageOutlets } from '@/modules/outlet/permissions'
import { OutletEditPage } from './_components/outlet-edit-page'
import { PageNotFound } from '@/components/shared/page-state'
import { orNotFound } from '@/providers/not-found'

// Outside the outlet's tabs: a form of its own, with the way back to them.
export const Route = createFileRoute('/_auth/admin/outlets/$oid_/edit')({
  beforeLoad: ({ context }) => {
    if (!canManageOutlets(context.auth.user())) throw redirect({ to: '/admin' })
  },
  loader: ({ context, params }) => orNotFound(context.queryClient.ensureQueryData(outletQuery(params.oid))),
  component: OutletEditPage,
  // Here rather than at the root, so the admin area stays around it.
  notFoundComponent: PageNotFound,
})
