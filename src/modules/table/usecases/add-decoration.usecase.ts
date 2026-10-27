import { NEW_BOX_SIZE, type DecorationKind, type Draft } from '../types'
import { fitBox } from '../validations/layout.validation'
import { freeSpot } from './find-free-spot.usecase'

/** A decoration of the kind added at its size, at at or in the first free spot; with its ID. */
export function addDecoration(
  draft: Draft,
  kind: DecorationKind,
  at?: { x: number; y: number },
): { draft: Draft; id: string } {
  const { w, h } = NEW_BOX_SIZE[kind]
  const spot = at ?? freeSpot(draft, w, h) ?? { x: 0, y: 0 }
  // An ID no decoration of the draft has.
  let n = draft.decorations.length
  while (draft.decorations.some((d) => d.id === `d${n}`)) n++
  const id = `d${n}`
  return {
    draft: {
      ...draft,
      decorations: [...draft.decorations, { id, kind, box: fitBox({ ...spot, w, h }, 'decoration'), rotation: 0 }],
    },
    id,
  }
}
