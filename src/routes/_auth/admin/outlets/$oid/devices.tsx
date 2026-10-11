import { createFileRoute, redirect } from '@tanstack/react-router'

import { deviceListQuery } from '@/features/device/api'
import { DeviceListPage } from '@/features/device/components/DeviceListPage'
import { listSearch } from '@/shared/lib/list-search'

// The outlet's cashier devices, for the fixed roles rather than a
// permission, as the API has it: its Manager, and the Owner. The $oid layout
// has checked the outlet is the user's own, or that the user is the Owner.
export const Route = createFileRoute('/_auth/admin/outlets/$oid/devices')({
  validateSearch: (search): { page?: number } => ({ page: listSearch(search).page }),
  beforeLoad: ({ context }) => {
    const user = context.auth.user()
    if (!user?.is_owner && !user?.is_manager) throw redirect({ to: '/admin' })
  },
  loaderDeps: ({ search }) => search,
  loader: ({ context, params, deps }) => context.queryClient.ensureQueryData(deviceListQuery(params.oid, deps.page)),
  component: DeviceListPage,
})
