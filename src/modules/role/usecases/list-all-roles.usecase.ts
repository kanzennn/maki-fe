import * as roleRepository from '../repositories/role.repository'
import type { Role } from '../types'

/**
 * Every role of an outlet, for a role filter or picker: the API's largest
 * page, which an outlet's handful of roles never fills.
 */
export async function listAllRoles(outletId: string): Promise<Role[]> {
  return (await roleRepository.listRoles(outletId, { page_size: 100 })).items
}
