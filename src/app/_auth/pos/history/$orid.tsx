import { createFileRoute } from '@tanstack/react-router'

import { PageNotFound } from '@/components/shared/page-state'
import { catalogQuery, orderQuery } from '@/hooks/pos/pos.queries'
import { canSell } from '@/modules/pos/permissions'
import { orNotFound } from '@/providers/not-found'

import { OrderPage } from './_components/order-page'

export const Route = createFileRoute('/_auth/pos/history/$orid')({
  loader: ({ context, params }) =>
    orNotFound(
      Promise.all([
        context.queryClient.ensureQueryData(orderQuery(context.outletId, params.orid)),
        // The receipt's address and phone, for whoever may load the catalog.
        canSell(context.auth.user()) && context.queryClient.prefetchQuery(catalogQuery(context.outletId)),
      ]),
    ),
  component: OrderPage,
  notFoundComponent: PageNotFound,
})
