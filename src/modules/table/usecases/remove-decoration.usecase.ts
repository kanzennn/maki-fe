import type { Draft } from '../types'

export function removeDecoration(draft: Draft, id: string): Draft {
  return { ...draft, decorations: draft.decorations.filter((d) => d.id !== id) }
}
