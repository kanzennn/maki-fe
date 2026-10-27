import { createFileRoute, redirect } from '@tanstack/react-router'

import { outletVoucherListQuery } from '@/hooks/voucher/voucher.queries'
import { voucherListFromUrl } from '@/modules/voucher/filters'
import { canViewOutletVouchers } from '@/modules/voucher/permissions'

import { OutletVoucherListPage } from './_components/outlet-voucher-list-page'

// The vouchers the outlet's cashier can take, for the fixed roles rather
// than a permission, as the API has it: its Manager, and the Owner. The $oid
// layout has checked the outlet is the user's own, or that the user is the
// Owner.
export const Route = createFileRoute('/_auth/admin/outlets/$oid/vouchers')({
  validateSearch: voucherListFromUrl,
  beforeLoad: ({ context }) => {
    if (!canViewOutletVouchers(context.auth.user())) throw redirect({ to: '/admin' })
  },
  loaderDeps: ({ search }) => search,
  loader: ({ context, params, deps }) => context.queryClient.ensureQueryData(outletVoucherListQuery(params.oid, deps)),
  component: OutletVoucherListPage,
})
