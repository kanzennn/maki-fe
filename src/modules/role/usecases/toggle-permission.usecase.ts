/**
 * The permission code needs to be of use: managing something means seeing it
 * first (`user.manage` needs `user.view`).
 */
export function viewFor(code: string): string | undefined {
  const [module, action] = code.split('.')
  return action === 'manage' ? `${module}.view` : undefined
}

/**
 * A role's permissions after code is ticked or unticked in its checklist:
 * ticking a manage ticks its view too, when allowed; unticking a view
 * unticks the manage that needs it, since managing without seeing is of no use.
 */
export function togglePermission(
  selected: readonly string[],
  code: string,
  checked: boolean,
  allowed: (code: string) => boolean,
): string[] {
  const next = new Set(selected)
  if (checked) {
    next.add(code)
    const view = viewFor(code)
    if (view && allowed(view)) next.add(view)
  } else {
    next.delete(code)
    for (const held of selected) if (viewFor(held) === code) next.delete(held)
  }
  return [...next]
}
