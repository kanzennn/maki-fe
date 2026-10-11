import { createFileRoute, redirect } from '@tanstack/react-router'

import { redemptionsQuery, voucherQuery } from '@/features/voucher/api'
import { VoucherDetailPage } from '@/features/voucher/components/VoucherDetailPage'
import { PageNotFound } from '@/shared/components/PageState'
import { listSearch } from '@/shared/lib/list-search'
import { orNotFound } from '@/shared/lib/not-found'

// One voucher, with the page of its history the address names.
export const Route = createFileRoute('/_auth/admin/vouchers/$vid')({
  validateSearch: (search): { page?: number } => ({ page: listSearch(search).page }),
  beforeLoad: ({ context }) => {
    if (!context.auth.user()?.is_owner) throw redirect({ to: '/admin' })
  },
  loaderDeps: ({ search }) => search,
  loader: ({ context, params, deps }) =>
    orNotFound(
      Promise.all([
        context.queryClient.ensureQueryData(voucherQuery(params.vid)),
        context.queryClient.ensureQueryData(redemptionsQuery(params.vid, deps.page)),
      ]),
    ),
  component: VoucherDetailPage,
  // Here rather than at the root, so the admin area stays around it.
  notFoundComponent: PageNotFound,
})
