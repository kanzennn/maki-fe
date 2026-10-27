import { createFileRoute, redirect } from '@tanstack/react-router'

import { canManageOutlets } from '@/modules/outlet/permissions'

import { OutletInfoPage } from './_components/outlet-info-page'

// The outlet's own details are the Owner's; a Manager's outlet opens on its users.
export const Route = createFileRoute('/_auth/admin/outlets/$oid/')({
  beforeLoad: ({ context }) => {
    if (!canManageOutlets(context.auth.user())) throw redirect({ to: '/admin' })
  },
  component: OutletInfoPage,
})
