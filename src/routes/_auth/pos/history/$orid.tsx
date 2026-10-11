import { createFileRoute } from '@tanstack/react-router'

import { catalogQuery, orderQuery } from '@/features/pos/api'
import { OrderPage } from '@/features/pos/components/OrderPage'
import { PageNotFound } from '@/shared/components/PageState'
import { orNotFound } from '@/shared/lib/not-found'
import { can } from '@/shared/lib/permissions'

export const Route = createFileRoute('/_auth/pos/history/$orid')({
  loader: ({ context, params }) =>
    orNotFound(
      Promise.all([
        context.queryClient.ensureQueryData(orderQuery(context.outletId, params.orid)),
        // The receipt's address and phone, for whoever may load the catalog.
        can(context.auth.user(), 'checkout.create') && context.queryClient.prefetchQuery(catalogQuery(context.outletId)),
      ]),
    ),
  component: OrderPage,
  notFoundComponent: PageNotFound,
})
