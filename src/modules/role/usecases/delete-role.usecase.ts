import * as roleRepository from '../repositories/role.repository'

/** Deletes the role, which nobody holds by then. */
export function deleteRole(outletId: string, roleId: string): Promise<void> {
  return roleRepository.deleteRole(outletId, roleId)
}
