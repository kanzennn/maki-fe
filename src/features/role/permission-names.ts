import type { TFunction } from 'i18next'

// Codes and modules come from the server's catalog, which can grow before
// the app learns a new one: defaultValue shows the code until then.

export function permissionName(t: TFunction<'role'>, code: string): string {
  return t(`permissions.${code}` as 'permissions.dashboard.view', { defaultValue: code })
}

export function moduleName(t: TFunction<'role'>, module: string): string {
  return t(`modules.${module}` as 'modules.dashboard', { defaultValue: module })
}
