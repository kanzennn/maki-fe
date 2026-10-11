import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import { api, unwrap } from '@/shared/api/client'
import { queryKeys } from '@/shared/api/query-keys'
import type { components } from '@/shared/api/schema'

export type Staff = components['schemas']['Staff']
export type CreateStaffRequest = components['schemas']['CreateStaffRequest']
export type UpdateStaffRequest = components['schemas']['UpdateStaffRequest']
export type StaffStatus = Staff['status']

/** The user list's search, from the address bar. */
export type StaffSearch = { q?: string; status?: StaffStatus; role_id?: string; page?: number }

export const staffListQuery = (outletId: string, search: StaffSearch) =>
  queryOptions({
    queryKey: [...queryKeys.staff.lists(outletId), search] as const,
    queryFn: () =>
      unwrap(api.GET('/api/v1/outlets/{oid}/users', { params: { path: { oid: outletId }, query: search } })),
  })

export const staffQuery = (outletId: string, userId: string) =>
  queryOptions({
    queryKey: queryKeys.staff.detail(outletId, userId),
    queryFn: () =>
      unwrap(api.GET('/api/v1/outlets/{oid}/users/{uid}', { params: { path: { oid: outletId, uid: userId } } })),
  })

/**
 * After a user changes: the user lists, the roles' user counts, and the
 * outlet's Managers, which the Owner's pages show.
 */
function useChanged(outletId: string) {
  const queryClient = useQueryClient()
  return (staff?: Staff) => {
    if (staff) queryClient.setQueryData(queryKeys.staff.detail(outletId, staff.user_id), staff)
    void queryClient.invalidateQueries({ queryKey: queryKeys.staff.lists(outletId) })
    void queryClient.invalidateQueries({ queryKey: queryKeys.roles.all(outletId) })
    void queryClient.invalidateQueries({ queryKey: queryKeys.outlets.detail(outletId) })
    void queryClient.invalidateQueries({ queryKey: queryKeys.outlets.lists() })
  }
}

export function useCreateStaff(outletId: string) {
  const changed = useChanged(outletId)
  return useMutation({
    mutationFn: (body: CreateStaffRequest) =>
      unwrap(api.POST('/api/v1/outlets/{oid}/users', { params: { path: { oid: outletId } }, body })),
    onSuccess: changed,
  })
}

export function useUpdateStaff(outletId: string, userId: string) {
  const changed = useChanged(outletId)
  return useMutation({
    mutationFn: (body: UpdateStaffRequest) =>
      unwrap(api.PUT('/api/v1/outlets/{oid}/users/{uid}', { params: { path: { oid: outletId, uid: userId } }, body })),
    onSuccess: changed,
  })
}

export function useSetStaffStatus(outletId: string, userId: string) {
  const changed = useChanged(outletId)
  return useMutation({
    mutationFn: (status: StaffStatus) =>
      unwrap(
        api.PATCH('/api/v1/outlets/{oid}/users/{uid}/status', {
          params: { path: { oid: outletId, uid: userId } },
          body: { status },
        }),
      ),
    onSuccess: changed,
  })
}

export function useResetStaffPassword(outletId: string, userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (password: string) =>
      unwrap(
        api.POST('/api/v1/outlets/{oid}/users/{uid}/reset-password', {
          params: { path: { oid: outletId, uid: userId } },
          body: { password },
        }),
      ),
    // The account now must change its password.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.staff.all(outletId) }),
  })
}

/**
 * Deletes the account. Its page is still open when this resolves: the
 * caller leaves it, then forgets the account with useForgetStaff.
 */
export function useDeleteStaff(outletId: string, userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      unwrap(api.DELETE('/api/v1/outlets/{oid}/users/{uid}', { params: { path: { oid: outletId, uid: userId } } })),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.staff.lists(outletId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.roles.all(outletId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.outlets.all })
    },
  })
}

export function useForgetStaff(outletId: string) {
  const queryClient = useQueryClient()
  return (userId: string) => queryClient.removeQueries({ queryKey: queryKeys.staff.detail(outletId, userId) })
}
