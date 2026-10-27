import type { Draft } from '../types'
import { toLayoutInput } from '../validations/layout.validation'

/** Whether two drafts save the same layout. */
export function sameLayout(a: Draft, b: Draft): boolean {
  return JSON.stringify(toLayoutInput(a)) === JSON.stringify(toLayoutInput(b))
}
