import { createFileRoute, redirect } from '@tanstack/react-router'

import { deviceListQuery } from '@/hooks/device/device.queries'
import { deviceListFromUrl } from '@/modules/device/filters'
import { canManageDevices } from '@/modules/device/permissions'

import { DeviceListPage } from './_components/device-list-page'

// The outlet's cashier devices, for the fixed roles rather than a
// permission, as the API has it: its Manager, and the Owner. The $oid layout
// has checked the outlet is the user's own, or that the user is the Owner.
export const Route = createFileRoute('/_auth/admin/outlets/$oid/devices')({
  validateSearch: deviceListFromUrl,
  beforeLoad: ({ context }) => {
    if (!canManageDevices(context.auth.user())) throw redirect({ to: '/admin' })
  },
  loaderDeps: ({ search }) => search,
  loader: ({ context, params, deps }) => context.queryClient.ensureQueryData(deviceListQuery(params.oid, deps)),
  component: DeviceListPage,
})
