import { createFileRoute, redirect } from '@tanstack/react-router'

import { voucherListQuery, voucherStatuses, type VoucherSearch } from '@/features/voucher/api'
import { VoucherListPage } from '@/features/voucher/components/VoucherListPage'
import { listSearch } from '@/shared/lib/list-search'

// The Owner's vouchers; a Manager reads their outlet's from its own page.
export const Route = createFileRoute('/_auth/admin/vouchers/')({
  validateSearch: (search): VoucherSearch => ({
    ...listSearch(search),
    status: voucherStatuses.find((s) => s === search.status),
  }),
  beforeLoad: ({ context }) => {
    if (!context.auth.user()?.is_owner) throw redirect({ to: '/admin' })
  },
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(voucherListQuery(deps)),
  component: VoucherListPage,
})
