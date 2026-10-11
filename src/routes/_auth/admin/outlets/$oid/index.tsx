import { createFileRoute, redirect } from '@tanstack/react-router'

import { OutletInfoPage } from '@/features/outlet/components/OutletInfoPage'

// The outlet's own details are the Owner's; a Manager's outlet opens on its users.
export const Route = createFileRoute('/_auth/admin/outlets/$oid/')({
  beforeLoad: ({ context }) => {
    if (!context.auth.user()?.is_owner) throw redirect({ to: '/admin' })
  },
  component: OutletInfoPage,
})
