import { createFileRoute, redirect } from '@tanstack/react-router'

import { outletListQuery } from '@/hooks/outlet/outlet.queries'
import { outletListFromUrl } from '@/modules/outlet/filters'
import { canManageOutlets } from '@/modules/outlet/permissions'

import { OutletListPage } from './_components/outlet-list-page'

// The Owner's outlets; anyone else starts from their own page.
export const Route = createFileRoute('/_auth/admin/outlets/')({
  validateSearch: outletListFromUrl,
  beforeLoad: ({ context }) => {
    if (!canManageOutlets(context.auth.user())) throw redirect({ to: '/admin' })
  },
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(outletListQuery(deps)),
  component: OutletListPage,
})
