import { createFileRoute, redirect } from '@tanstack/react-router'

import { VoucherCreatePage } from '@/features/voucher/components/VoucherCreatePage'

export const Route = createFileRoute('/_auth/admin/vouchers/new')({
  beforeLoad: ({ context }) => {
    if (!context.auth.user()?.is_owner) throw redirect({ to: '/admin' })
  },
  component: VoucherCreatePage,
})
