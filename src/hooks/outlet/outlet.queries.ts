import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/hooks/query-keys'
import type { Outlet, OutletFormValues, OutletListState, OutletStatus } from '@/modules/outlet/types'
import { createOutlet } from '@/modules/outlet/usecases/create-outlet.usecase'
import { deleteOutlet } from '@/modules/outlet/usecases/delete-outlet.usecase'
import { getOutlet } from '@/modules/outlet/usecases/get-outlet.usecase'
import { listAllOutlets } from '@/modules/outlet/usecases/list-all-outlets.usecase'
import { listOutlets } from '@/modules/outlet/usecases/list-outlets.usecase'
import { setOutletStatus } from '@/modules/outlet/usecases/set-outlet-status.usecase'
import { updateOutlet } from '@/modules/outlet/usecases/update-outlet.usecase'

export const outletListQuery = (state: OutletListState) =>
  queryOptions({
    queryKey: [...queryKeys.outlets.lists(), state] as const,
    queryFn: () => listOutlets(state),
  })

/**
 * Every outlet of the Owner's, for a picker, by name: a voucher's outlets. A
 * change to an outlet reloads it with the outlet lists.
 */
export const allOutletsQuery = () =>
  queryOptions({
    queryKey: [...queryKeys.outlets.lists(), 'choices'] as const,
    queryFn: listAllOutlets,
  })

export const outletQuery = (outletId: string) =>
  queryOptions({
    queryKey: queryKeys.outlets.detail(outletId),
    queryFn: () => getOutlet(outletId),
  })

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
    mutationFn: (values: OutletFormValues) => createOutlet(values),
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
    mutationFn: (values: OutletFormValues) => updateOutlet(outletId, values),
    onSuccess: saved,
  })
}

export function useSetOutletStatus(outletId: string) {
  const saved = useSaved()
  return useMutation({
    mutationFn: (status: OutletStatus) => setOutletStatus(outletId, status),
    onSuccess: saved,
  })
}

/**
 * Deletes the outlet. Its page is still open when this resolves: the caller
 * leaves it, then drops the outlet from the cache with useForgetOutlet.
 */
export function useDeleteOutlet(outlet: Pick<Outlet, 'outlet_id' | 'name'>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (typedName: string) => deleteOutlet(outlet, typedName),
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
