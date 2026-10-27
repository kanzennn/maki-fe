import { createFileRoute, redirect } from '@tanstack/react-router'

import { catalogQuery, posDeviceQuery } from '@/hooks/pos/pos.queries'
import { canSell } from '@/modules/pos/permissions'

import { SellPage } from './_components/sell-page'

export const Route = createFileRoute('/_auth/pos/')({
  // Selling needs checkout.create; whoever only voids has today's orders.
  beforeLoad: ({ context }) => {
    if (!canSell(context.auth.user())) throw redirect({ to: '/pos/history' })
  },
  // The device's answer may be that it can't sell, which the page explains:
  // fetched, not ensured, so it isn't the route's error.
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.prefetchQuery(posDeviceQuery(context.outletId)),
      context.queryClient.ensureQueryData(catalogQuery(context.outletId)),
    ]),
  component: SellPage,
})
