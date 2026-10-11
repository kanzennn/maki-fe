import { createFileRoute, redirect } from '@tanstack/react-router'

import { voucherQuery } from '@/features/voucher/api'
import { VoucherEditPage } from '@/features/voucher/components/VoucherEditPage'
import { PageNotFound } from '@/shared/components/PageState'
import { orNotFound } from '@/shared/lib/not-found'

// A form of its own, with the way back to the voucher.
export const Route = createFileRoute('/_auth/admin/vouchers/$vid_/edit')({
  beforeLoad: ({ context }) => {
    if (!context.auth.user()?.is_owner) throw redirect({ to: '/admin' })
  },
  loader: ({ context, params }) => orNotFound(context.queryClient.ensureQueryData(voucherQuery(params.vid))),
  component: VoucherEditPage,
  // Here rather than at the root, so the admin area stays around it.
  notFoundComponent: PageNotFound,
})
