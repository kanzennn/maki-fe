import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import { api, unwrap } from '@/shared/api/client'
import { queryKeys } from '@/shared/api/query-keys'
import type { components } from '@/shared/api/schema'

export type Device = components['schemas']['Device']

/** A page of the outlet's cashier devices: those in use first, then the revoked. */
export const deviceListQuery = (outletId: string, page?: number) =>
  queryOptions({
    queryKey: [...queryKeys.devices.all(outletId), { page }] as const,
    queryFn: () =>
      unwrap(api.GET('/api/v1/outlets/{oid}/devices', { params: { path: { oid: outletId }, query: { page } } })),
  })

/** Revokes a device: it can't sell from then on. */
export function useRevokeDevice(outletId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (deviceId: string) =>
      unwrap(
        api.DELETE('/api/v1/outlets/{oid}/devices/{did}', { params: { path: { oid: outletId, did: deviceId } } }),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.devices.all(outletId) })
      // A browser revoked while it is the cashier finds out at its next request.
      void queryClient.invalidateQueries({ queryKey: queryKeys.pos.device(outletId) })
    },
  })
}
