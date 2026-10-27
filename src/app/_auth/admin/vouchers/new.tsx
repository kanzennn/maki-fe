import { createFileRoute, redirect } from '@tanstack/react-router'

import { canManageVouchers } from '@/modules/voucher/permissions'

import { VoucherCreatePage } from './_components/voucher-create-page'

export const Route = createFileRoute('/_auth/admin/vouchers/new')({
  beforeLoad: ({ context }) => {
    if (!canManageVouchers(context.auth.user())) throw redirect({ to: '/admin' })
  },
  component: VoucherCreatePage,
})
