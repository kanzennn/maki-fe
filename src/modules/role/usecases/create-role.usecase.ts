import * as roleRepository from '../repositories/role.repository'
import type { RoleDetail, RoleFormValues } from '../types'
import { validateRoleForm } from '../validations/role.validation'

export function createRole(outletId: string, values: RoleFormValues): Promise<RoleDetail> {
  return roleRepository.createRole(outletId, validateRoleForm(values))
}
