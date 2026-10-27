import type { Me } from '@/modules/auth/types'

// The outlets are the Owner's. These only hide what a user can't do; the
// server decides.

/** Whether user lists, makes, edits and deletes outlets: the Owner. */
export function canManageOutlets(user: Pick<Me, 'is_owner'> | null | undefined): boolean {
  return Boolean(user?.is_owner)
}

/** Whether user opens the outlet's pages, as the API scopes them: the Owner any, anyone else their own. */
export function canOpenOutlet(user: Pick<Me, 'is_owner' | 'outlet'> | null | undefined, outletId: string): boolean {
  return Boolean(user?.is_owner || user?.outlet?.outlet_id === outletId)
}
