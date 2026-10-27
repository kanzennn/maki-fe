import * as roleRepository from '../repositories/role.repository'
import type { RoleDetail, RoleFormValues } from '../types'
import { validateRoleForm } from '../validations/role.validation'

export function updateRole(outletId: string, roleId: string, values: RoleFormValues): Promise<RoleDetail> {
  return roleRepository.updateRole(outletId, roleId, validateRoleForm(values))
}
