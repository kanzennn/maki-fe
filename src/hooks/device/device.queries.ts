import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/hooks/query-keys'
import type { DeviceListState } from '@/modules/device/types'
import { activateDevice } from '@/modules/device/usecases/activate-device.usecase'
import { listDevices } from '@/modules/device/usecases/list-devices.usecase'
import { revokeDevice } from '@/modules/device/usecases/revoke-device.usecase'

/** The page of the outlet's cashier devices the list shows. */
export const deviceListQuery = (outletId: string, state: DeviceListState) =>
  queryOptions({
    queryKey: [...queryKeys.devices.all(outletId), state] as const,
    queryFn: () => listDevices(outletId, state),
  })

/**
 * Makes this browser one of the outlet's cashiers, as its Manager, under a
 * name. The token comes back as a cookie that page scripts can't read.
 */
export function useActivateDevice(outletId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => activateDevice(outletId, name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.pos.device(outletId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.devices.all(outletId) })
    },
  })
}

/** Revokes a device: it can't sell from then on. */
export function useRevokeDevice(outletId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (deviceId: string) => revokeDevice(outletId, deviceId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.devices.all(outletId) })
      // A browser revoked while it is the cashier finds out at its next request.
      void queryClient.invalidateQueries({ queryKey: queryKeys.pos.device(outletId) })
    },
  })
}
