import { createFileRoute } from '@tanstack/react-router'

import { todayOrdersQuery } from '@/hooks/pos/pos.queries'
import { orderListFromUrl } from '@/modules/pos/filters'

import { HistoryPage } from './_components/history-page'

// Today's orders, for whoever sells or voids (the layout checked).
export const Route = createFileRoute('/_auth/pos/history/')({
  validateSearch: orderListFromUrl,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(todayOrdersQuery(context.outletId, deps)),
  component: HistoryPage,
})
