import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/hooks/query-keys'
import type { RoleFormValues, RoleListState } from '@/modules/role/types'
import { createRole } from '@/modules/role/usecases/create-role.usecase'
import { deleteRole } from '@/modules/role/usecases/delete-role.usecase'
import { getPermissionCatalog } from '@/modules/role/usecases/get-permission-catalog.usecase'
import { getRole } from '@/modules/role/usecases/get-role.usecase'
import { listAllRoles } from '@/modules/role/usecases/list-all-roles.usecase'
import { listRoles } from '@/modules/role/usecases/list-roles.usecase'
import { refreshOwnPermissions } from '@/modules/role/usecases/refresh-own-permissions.usecase'
import { updateRole } from '@/modules/role/usecases/update-role.usecase'

export const roleListQuery = (outletId: string, state: RoleListState) =>
  queryOptions({
    queryKey: [...queryKeys.roles.lists(outletId), state] as const,
    queryFn: () => listRoles(outletId, state),
  })

/** Every role of an outlet, for a role filter or picker. Whoever may see the outlet's roles or users may load it. */
export const allRolesQuery = (outletId: string) =>
  queryOptions({
    queryKey: [...queryKeys.roles.lists(outletId), 'all'] as const,
    queryFn: () => listAllRoles(outletId),
  })

export const roleQuery = (outletId: string, roleId: string) =>
  queryOptions({
    queryKey: queryKeys.roles.detail(outletId, roleId),
    queryFn: () => getRole(outletId, roleId),
  })

/** Every permission there is, by module: fixed in the backend's code, so fetched once. */
export const permissionCatalogQuery = () =>
  queryOptions({
    queryKey: ['permissions'] as const,
    queryFn: getPermissionCatalog,
    staleTime: Infinity,
  })

/** After a role changes: its lists and page, the user rows that show its name, and staff's own permissions. */
function useChanged(outletId: string) {
  const queryClient = useQueryClient()
  return async () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.roles.all(outletId) })
    void queryClient.invalidateQueries({ queryKey: queryKeys.staff.all(outletId) })
    await refreshOwnPermissions()
  }
}

export function useCreateRole(outletId: string) {
  const changed = useChanged(outletId)
  return useMutation({
    mutationFn: (values: RoleFormValues) => createRole(outletId, values),
    onSuccess: changed,
  })
}

export function useUpdateRole(outletId: string, roleId: string) {
  const changed = useChanged(outletId)
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: RoleFormValues) => updateRole(outletId, roleId, values),
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
    mutationFn: () => deleteRole(outletId, roleId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.roles.lists(outletId) }),
  })
}

export function useForgetRole(outletId: string) {
  const queryClient = useQueryClient()
  return (roleId: string) => queryClient.removeQueries({ queryKey: queryKeys.roles.detail(outletId, roleId) })
}
