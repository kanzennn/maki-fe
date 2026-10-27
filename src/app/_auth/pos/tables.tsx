import { createFileRoute, redirect } from '@tanstack/react-router'

import { catalogQuery } from '@/hooks/pos/pos.queries'
import { floorQuery } from '@/hooks/table/table.queries'
import { canSell } from '@/modules/pos/permissions'

import { FloorPage } from './_components/floor-page'

// The tables, for whoever sells: whoever only voids has today's orders. The
// catalog says whether the outlet seats its customers at them.
export const Route = createFileRoute('/_auth/pos/tables')({
  beforeLoad: ({ context }) => {
    if (!canSell(context.auth.user())) throw redirect({ to: '/pos/history' })
  },
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(floorQuery(context.outletId)),
      context.queryClient.ensureQueryData(catalogQuery(context.outletId)),
    ]),
  component: FloorPage,
})
