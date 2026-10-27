import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'

import { PagePending } from '@/components/shared/page-state'

import { posDeviceQuery } from '@/hooks/pos/pos.queries'
import { DeviceGate } from './device-gate'
import { Sell } from './sell'

const route = getRouteApi('/_auth/pos/')

/**
 * The cashier's sell screen, on a device the outlet has activated. Anything
 * else — a device not registered, or revoked — gets the screen that says
 * so, and lets a Manager activate it.
 */
export function SellPage() {
  const { outletId } = route.useRouteContext()
  const device = useQuery(posDeviceQuery(outletId))

  if (device.isPending) return <PagePending />
  if (device.isError) return <DeviceGate outletId={outletId} error={device.error} onRetry={() => void device.refetch()} />
  return <Sell outletId={outletId} device={device.data} />
}
