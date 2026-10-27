import { createFileRoute, redirect } from '@tanstack/react-router'

import { PageNotFound } from '@/components/shared/page-state'
import { redemptionsQuery, voucherQuery } from '@/hooks/voucher/voucher.queries'
import { redemptionsFromUrl } from '@/modules/voucher/filters'
import { canManageVouchers } from '@/modules/voucher/permissions'
import { orNotFound } from '@/providers/not-found'

import { VoucherDetailPage } from './_components/voucher-detail-page'

// One voucher, with the page of its history the address names.
export const Route = createFileRoute('/_auth/admin/vouchers/$vid')({
  validateSearch: redemptionsFromUrl,
  beforeLoad: ({ context }) => {
    if (!canManageVouchers(context.auth.user())) throw redirect({ to: '/admin' })
  },
  loaderDeps: ({ search }) => search,
  loader: ({ context, params, deps }) =>
    orNotFound(
      Promise.all([
        context.queryClient.ensureQueryData(voucherQuery(params.vid)),
        context.queryClient.ensureQueryData(redemptionsQuery(params.vid, deps)),
      ]),
    ),
  component: VoucherDetailPage,
  // Here rather than at the root, so the admin area stays around it.
  notFoundComponent: PageNotFound,
})
