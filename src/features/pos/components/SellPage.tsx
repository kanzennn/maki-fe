import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'

import { PagePending } from '@/shared/components/PageState'

import { posDeviceQuery } from '../api'
import { DeviceGate } from './DeviceGate'
import { Sell } from './Sell'

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
