import { createFileRoute, redirect } from '@tanstack/react-router'

import { OutletCreatePage } from '@/features/outlet/components/OutletCreatePage'

export const Route = createFileRoute('/_auth/admin/outlets/new')({
  beforeLoad: ({ context }) => {
    if (!context.auth.user()?.is_owner) throw redirect({ to: '/admin' })
  },
  component: OutletCreatePage,
})
