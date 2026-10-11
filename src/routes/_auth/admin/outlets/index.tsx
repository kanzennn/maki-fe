import { createFileRoute, redirect } from '@tanstack/react-router'

import { outletListQuery, type OutletSearch } from '@/features/outlet/api'
import { OutletListPage } from '@/features/outlet/components/OutletListPage'
import { listSearch } from '@/shared/lib/list-search'

// The Owner's outlets; anyone else starts from their own page.
export const Route = createFileRoute('/_auth/admin/outlets/')({
  validateSearch: (search): OutletSearch => ({
    ...listSearch(search),
    status: search.status === 'active' || search.status === 'inactive' ? search.status : undefined,
  }),
  beforeLoad: ({ context }) => {
    if (!context.auth.user()?.is_owner) throw redirect({ to: '/admin' })
  },
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(outletListQuery(deps)),
  component: OutletListPage,
})
