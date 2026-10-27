import { createFileRoute, redirect } from '@tanstack/react-router'

import { voucherListQuery } from '@/hooks/voucher/voucher.queries'
import { voucherListFromUrl } from '@/modules/voucher/filters'
import { canManageVouchers } from '@/modules/voucher/permissions'

import { VoucherListPage } from './_components/voucher-list-page'

// The Owner's vouchers; a Manager reads their outlet's from its own page.
export const Route = createFileRoute('/_auth/admin/vouchers/')({
  validateSearch: voucherListFromUrl,
  beforeLoad: ({ context }) => {
    if (!canManageVouchers(context.auth.user())) throw redirect({ to: '/admin' })
  },
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(voucherListQuery(deps)),
  component: VoucherListPage,
})
