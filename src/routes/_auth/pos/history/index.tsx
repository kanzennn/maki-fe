import { createFileRoute } from '@tanstack/react-router'

import { todayOrdersQuery, type OrderSearch } from '@/features/pos/api'
import { HistoryPage } from '@/features/pos/components/HistoryPage'
import { listSearch } from '@/shared/lib/list-search'

// Today's orders, for whoever sells or voids (the layout checked).
export const Route = createFileRoute('/_auth/pos/history/')({
  validateSearch: (search): OrderSearch => listSearch(search),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(todayOrdersQuery(context.outletId, deps)),
  component: HistoryPage,
})
