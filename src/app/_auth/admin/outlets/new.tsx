import { createFileRoute, redirect } from '@tanstack/react-router'

import { canManageOutlets } from '@/modules/outlet/permissions'

import { OutletCreatePage } from './_components/outlet-create-page'

export const Route = createFileRoute('/_auth/admin/outlets/new')({
  beforeLoad: ({ context }) => {
    if (!canManageOutlets(context.auth.user())) throw redirect({ to: '/admin' })
  },
  component: OutletCreatePage,
})
