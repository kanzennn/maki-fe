/**
 * Where to go after signing in. Only a path inside the app is accepted, so a
 * crafted ?redirect= can't send anyone to another site.
 */
export function safeRedirect(target: unknown): string {
  if (typeof target !== 'string' || !target.startsWith('/') || target.startsWith('//') || target.startsWith('/\\')) {
    return '/admin'
  }
  return target
}
