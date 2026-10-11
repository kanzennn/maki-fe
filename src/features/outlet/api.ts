import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import { api, unwrap } from '@/shared/api/client'
import { queryKeys } from '@/shared/api/query-keys'
import type { components } from '@/shared/api/schema'

export type Outlet = components['schemas']['Outlet']
export type OutletInput = components['schemas']['OutletInput']
export type OutletSummary = components['schemas']['OutletSummary']
export type OutletStatus = Outlet['status']

/** The outlet list's search, from the address bar. */
export type OutletSearch = { q?: string; status?: OutletStatus; page?: number }

export const outletListQuery = (search: OutletSearch) =>
  queryOptions({
    queryKey: [...queryKeys.outlets.lists(), search] as const,
    queryFn: () => unwrap(api.GET('/api/v1/outlets', { params: { query: search } })),
  })

export const outletQuery = (outletId: string) =>
  queryOptions({
    queryKey: queryKeys.outlets.detail(outletId),
    queryFn: () => unwrap(api.GET('/api/v1/outlets/{oid}', { params: { path: { oid: outletId } } })),
  })

/** What the pages inside an outlet need to know about it, as GET /me gives a Manager theirs. */
export function outletSummary(outlet: Outlet): OutletSummary {
  const { outlet_id, code, name, timezone, locale } = outlet
  return { outlet_id, code, name, timezone, locale }
}

/** Keeps the outlet's page up to date after a change, and every list that may show it. */
function useSaved() {
  const queryClient = useQueryClient()
  return (outlet: Outlet) => {
    queryClient.setQueryData(queryKeys.outlets.detail(outlet.outlet_id), outlet)
    void queryClient.invalidateQueries({ queryKey: queryKeys.outlets.lists() })
  }
}

export function useCreateOutlet() {
  const saved = useSaved()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: OutletInput) => unwrap(api.POST('/api/v1/outlets', { body })),
    onSuccess: (outlet) => {
      saved(outlet)
      // The new outlet's cashier role, made with it.
      void queryClient.invalidateQueries({ queryKey: queryKeys.roles.all(outlet.outlet_id) })
    },
  })
}

export function useUpdateOutlet(outletId: string) {
  const saved = useSaved()
  return useMutation({
    mutationFn: (body: OutletInput) =>
      unwrap(api.PUT('/api/v1/outlets/{oid}', { params: { path: { oid: outletId } }, body })),
    onSuccess: saved,
  })
}

export function useSetOutletStatus(outletId: string) {
  const saved = useSaved()
  return useMutation({
    mutationFn: (status: OutletStatus) =>
      unwrap(api.PATCH('/api/v1/outlets/{oid}/status', { params: { path: { oid: outletId } }, body: { status } })),
    onSuccess: saved,
  })
}

/**
 * Deletes the outlet. Its page is still open when this resolves: the caller
 * leaves it, then drops the outlet from the cache with useForgetOutlet.
 */
export function useDeleteOutlet(outletId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (confirmName: string) =>
      unwrap(
        api.DELETE('/api/v1/outlets/{oid}', {
          params: { path: { oid: outletId } },
          body: { confirm_name: confirmName },
        }),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.outlets.lists() }),
  })
}

export function useForgetOutlet() {
  const queryClient = useQueryClient()
  return (outletId: string) => {
    queryClient.removeQueries({ queryKey: queryKeys.outlets.detail(outletId) })
    queryClient.removeQueries({ queryKey: queryKeys.roles.all(outletId) })
    queryClient.removeQueries({ queryKey: queryKeys.staff.all(outletId) })
  }
}
