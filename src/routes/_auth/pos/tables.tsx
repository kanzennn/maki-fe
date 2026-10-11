import { createFileRoute, redirect } from '@tanstack/react-router'

import { catalogQuery, floorQuery } from '@/features/pos/api'
import { FloorPage } from '@/features/pos/components/FloorPage'
import { can } from '@/shared/lib/permissions'

// The tables, for whoever sells: whoever only voids has today's orders. The
// catalog says whether the outlet seats its customers at them.
export const Route = createFileRoute('/_auth/pos/tables')({
  beforeLoad: ({ context }) => {
    if (!can(context.auth.user(), 'checkout.create')) throw redirect({ to: '/pos/history' })
  },
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(floorQuery(context.outletId)),
      context.queryClient.ensureQueryData(catalogQuery(context.outletId)),
    ]),
  component: FloorPage,
})
