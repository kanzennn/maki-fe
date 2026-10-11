import { createFileRoute, redirect } from '@tanstack/react-router'

import { outletVoucherListQuery, voucherStatuses, type VoucherSearch } from '@/features/voucher/api'
import { OutletVoucherListPage } from '@/features/voucher/components/OutletVoucherListPage'
import { listSearch } from '@/shared/lib/list-search'

// The vouchers the outlet's cashier can take, for the fixed roles rather
// than a permission, as the API has it: its Manager, and the Owner. The $oid
// layout has checked the outlet is the user's own, or that the user is the
// Owner.
export const Route = createFileRoute('/_auth/admin/outlets/$oid/vouchers')({
  validateSearch: (search): VoucherSearch => ({
    ...listSearch(search),
    status: voucherStatuses.find((s) => s === search.status),
  }),
  beforeLoad: ({ context }) => {
    const user = context.auth.user()
    if (!user?.is_owner && !user?.is_manager) throw redirect({ to: '/admin' })
  },
  loaderDeps: ({ search }) => search,
  loader: ({ context, params, deps }) => context.queryClient.ensureQueryData(outletVoucherListQuery(params.oid, deps)),
  component: OutletVoucherListPage,
})
