import * as roleRepository from '../repositories/role.repository'
import type { PermissionCatalog } from '../types'

/** Every permission there is, by module, for a role's checklist. */
export function getPermissionCatalog(): Promise<PermissionCatalog> {
  return roleRepository.getPermissionCatalog()
}
