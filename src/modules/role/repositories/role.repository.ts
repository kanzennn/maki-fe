import { apiPath, http, type Page, type QueryParams } from '@/lib/http'

import type { PermissionCatalog, Role, RoleDetail, RoleInput } from '../types'

export function listRoles(outletId: string, params: QueryParams<'/outlets/{oid}/roles'>): Promise<Page<Role>> {
  return http.getPaginated<Role>(apiPath('/outlets/{oid}/roles', { oid: outletId }), params)
}

export function getRole(outletId: string, roleId: string): Promise<RoleDetail> {
  return http.get<RoleDetail>(apiPath('/outlets/{oid}/roles/{rid}', { oid: outletId, rid: roleId }))
}

export function getPermissionCatalog(): Promise<PermissionCatalog> {
  return http.get<PermissionCatalog>(apiPath('/permissions'))
}

export function createRole(outletId: string, body: RoleInput): Promise<RoleDetail> {
  return http.post<RoleDetail>(apiPath('/outlets/{oid}/roles', { oid: outletId }), body)
}

export function updateRole(outletId: string, roleId: string, body: RoleInput): Promise<RoleDetail> {
  return http.put<RoleDetail>(apiPath('/outlets/{oid}/roles/{rid}', { oid: outletId, rid: roleId }), body)
}

/** Deletes a role nobody holds. */
export function deleteRole(outletId: string, roleId: string): Promise<void> {
  return http.delete(apiPath('/outlets/{oid}/roles/{rid}', { oid: outletId, rid: roleId }))
}
