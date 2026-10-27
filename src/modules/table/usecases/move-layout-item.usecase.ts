import type { Draft, Selection } from '../types'
import { boxOf } from './find-layout-item.usecase'
import { setBox } from './set-layout-box.usecase'

/** The selection moved by dx, dy cells, stopping at the grid's edge. */
export function moveBy(draft: Draft, selection: Selection, dx: number, dy: number): Draft {
  const box = boxOf(draft, selection)
  return box ? setBox(draft, selection, { ...box, x: box.x + dx, y: box.y + dy }) : draft
}

/** The selection's top left cell moved to x, y, stopping at the grid's edge. */
export function moveTo(draft: Draft, selection: Selection, x: number, y: number): Draft {
  const box = boxOf(draft, selection)
  return box ? setBox(draft, selection, { ...box, x, y }) : draft
}
