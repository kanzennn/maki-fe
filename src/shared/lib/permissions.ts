import type { Me } from './session'

/**
 * The permission codes the app checks, from the backend's catalog
 * (GET /api/v1/permissions). The server enforces each one on every request;
 * the app only hides what a user can't do.
 */
export type Permission =
  | 'dashboard.view'
  | 'role.view'
  | 'role.manage'
  | 'user.view'
  | 'user.manage'
  | 'menu.view'
  | 'menu.manage'
  | 'stock.adjust'
  | 'table.view'
  | 'table.manage'
  | 'checkout.create'
  | 'order.void'
  | 'payment.manage'
  | 'log.view'

/** Whether user holds permission: in their outlet, or for the Owner in every outlet. */
export function can(user: Pick<Me, 'permissions'> | null | undefined, permission: Permission): boolean {
  return user?.permissions.includes(permission) ?? false
}

/** Whether user holds every one of codes, e.g. all of a role's permissions. */
export function holdsAll(user: Pick<Me, 'permissions'> | null | undefined, codes: readonly string[]): boolean {
  return codes.every((code) => user?.permissions.includes(code) ?? false)
}
