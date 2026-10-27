import type { Page } from '@/lib/http'

import { roleListParams } from '../filters'
import * as roleRepository from '../repositories/role.repository'
import type { Role, RoleListState } from '../types'

/** The page of the outlet's roles the list shows. */
export function listRoles(outletId: string, state: RoleListState): Promise<Page<Role>> {
  return roleRepository.listRoles(outletId, roleListParams(state))
}
