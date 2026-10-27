import { createFileRoute, redirect } from '@tanstack/react-router'

import { PageNotFound } from '@/components/shared/page-state'
import { voucherQuery } from '@/hooks/voucher/voucher.queries'
import { canManageVouchers } from '@/modules/voucher/permissions'
import { orNotFound } from '@/providers/not-found'

import { VoucherEditPage } from './_components/voucher-edit-page'

// A form of its own, with the way back to the voucher.
export const Route = createFileRoute('/_auth/admin/vouchers/$vid_/edit')({
  beforeLoad: ({ context }) => {
    if (!canManageVouchers(context.auth.user())) throw redirect({ to: '/admin' })
  },
  loader: ({ context, params }) => orNotFound(context.queryClient.ensureQueryData(voucherQuery(params.vid))),
  component: VoucherEditPage,
  // Here rather than at the root, so the admin area stays around it.
  notFoundComponent: PageNotFound,
})
