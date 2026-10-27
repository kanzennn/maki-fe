import * as roleRepository from '../repositories/role.repository'
import type { RoleDetail } from '../types'

export function getRole(outletId: string, roleId: string): Promise<RoleDetail> {
  return roleRepository.getRole(outletId, roleId)
}
