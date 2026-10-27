import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/hooks/query-keys'
import type {
  NewStaffValues,
  Staff,
  StaffListState,
  StaffProfileValues,
  StaffStatus,
  TemporaryPasswordValues,
} from '@/modules/user/types'
import { createStaff } from '@/modules/user/usecases/create-staff.usecase'
import { deleteStaff } from '@/modules/user/usecases/delete-staff.usecase'
import { demoteStaff } from '@/modules/user/usecases/demote-staff.usecase'
import { getStaff } from '@/modules/user/usecases/get-staff.usecase'
import { listStaff } from '@/modules/user/usecases/list-staff.usecase'
import { promoteStaff } from '@/modules/user/usecases/promote-staff.usecase'
import { resetStaffPassword } from '@/modules/user/usecases/reset-staff-password.usecase'
import { setStaffStatus } from '@/modules/user/usecases/set-staff-status.usecase'
import { updateStaffProfile } from '@/modules/user/usecases/update-staff-profile.usecase'

export const staffListQuery = (outletId: string, state: StaffListState) =>
  queryOptions({
    queryKey: [...queryKeys.staff.lists(outletId), state] as const,
    queryFn: () => listStaff(outletId, state),
  })

export const staffQuery = (outletId: string, userId: string) =>
  queryOptions({
    queryKey: queryKeys.staff.detail(outletId, userId),
    queryFn: () => getStaff(outletId, userId),
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
    mutationFn: (values: NewStaffValues) => createStaff(outletId, values),
    onSuccess: changed,
  })
}

export function useUpdateStaffProfile(outletId: string, userId: string) {
  const changed = useChanged(outletId)
  return useMutation({
    mutationFn: (values: StaffProfileValues) => updateStaffProfile(outletId, userId, values),
    onSuccess: changed,
  })
}

export function usePromoteStaff(outletId: string) {
  const changed = useChanged(outletId)
  return useMutation({
    mutationFn: (staff: Staff) => promoteStaff(outletId, staff),
    onSuccess: changed,
  })
}

export function useDemoteStaff(outletId: string) {
  const changed = useChanged(outletId)
  return useMutation({
    mutationFn: ({ staff, roleId }: { staff: Staff; roleId: string }) => demoteStaff(outletId, staff, roleId),
    onSuccess: changed,
  })
}

export function useSetStaffStatus(outletId: string, userId: string) {
  const changed = useChanged(outletId)
  return useMutation({
    mutationFn: (status: StaffStatus) => setStaffStatus(outletId, userId, status),
    onSuccess: changed,
  })
}

export function useResetStaffPassword(outletId: string, userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: TemporaryPasswordValues) => resetStaffPassword(outletId, userId, values),
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
    mutationFn: () => deleteStaff(outletId, userId),
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
