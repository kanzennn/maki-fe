import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import { api, unwrap } from '@/shared/api/client'
import { refreshMe } from '@/shared/api/me'
import { queryKeys } from '@/shared/api/query-keys'
import type { components } from '@/shared/api/schema'
import { useSession } from '@/shared/lib/session'

export type RoleDetail = components['schemas']['RoleDetail']
export type RoleInput = components['schemas']['RoleInput']
export type PermissionGroup = components['schemas']['PermissionGroup']

export const roleListQuery = (outletId: string, page?: number) =>
  queryOptions({
    queryKey: [...queryKeys.roles.lists(outletId), { page }] as const,
    queryFn: () =>
      unwrap(api.GET('/api/v1/outlets/{oid}/roles', { params: { path: { oid: outletId }, query: { page } } })),
  })

export const roleQuery = (outletId: string, roleId: string) =>
  queryOptions({
    queryKey: queryKeys.roles.detail(outletId, roleId),
    queryFn: () =>
      unwrap(api.GET('/api/v1/outlets/{oid}/roles/{rid}', { params: { path: { oid: outletId, rid: roleId } } })),
  })

/** Every permission there is, by module: fixed in the backend's code, so fetched once. */
export const permissionCatalogQuery = () =>
  queryOptions({
    queryKey: ['permissions'] as const,
    queryFn: () => unwrap(api.GET('/api/v1/permissions')),
    staleTime: Infinity,
  })

/**
 * After a role changes: its lists and page, the user rows that show its name,
 * and — for staff, who hold a role themselves — their own permissions.
 */
function useChanged(outletId: string) {
  const queryClient = useQueryClient()
  return async () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.roles.all(outletId) })
    void queryClient.invalidateQueries({ queryKey: queryKeys.staff.all(outletId) })
    const user = useSession.getState().user
    if (user && !user.is_owner && !user.is_manager) await refreshMe()
  }
}

export function useCreateRole(outletId: string) {
  const changed = useChanged(outletId)
  return useMutation({
    mutationFn: (body: RoleInput) =>
      unwrap(api.POST('/api/v1/outlets/{oid}/roles', { params: { path: { oid: outletId } }, body })),
    onSuccess: changed,
  })
}

export function useUpdateRole(outletId: string, roleId: string) {
  const changed = useChanged(outletId)
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: RoleInput) =>
      unwrap(
        api.PUT('/api/v1/outlets/{oid}/roles/{rid}', { params: { path: { oid: outletId, rid: roleId } }, body }),
      ),
    onSuccess: async (role) => {
      queryClient.setQueryData(queryKeys.roles.detail(outletId, roleId), role)
      await changed()
    },
  })
}

/**
 * Deletes the role, which nobody holds by then. Its page is still open when
 * this resolves: the caller leaves it, then forgets the role.
 */
export function useDeleteRole(outletId: string, roleId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      unwrap(api.DELETE('/api/v1/outlets/{oid}/roles/{rid}', { params: { path: { oid: outletId, rid: roleId } } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.roles.lists(outletId) }),
  })
}

export function useForgetRole(outletId: string) {
  const queryClient = useQueryClient()
  return (roleId: string) => queryClient.removeQueries({ queryKey: queryKeys.roles.detail(outletId, roleId) })
}
