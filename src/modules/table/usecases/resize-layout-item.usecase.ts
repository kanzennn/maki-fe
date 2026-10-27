import { GRID, type Draft, type Selection } from '../types'
import { boxLimits } from '../validations/layout.validation'
import { boxOf } from './find-layout-item.usecase'
import { setBox } from './set-layout-box.usecase'

/** The selection w × h cells from its top left, within its sides and the grid. */
export function resizeTo(draft: Draft, selection: Selection, w: number, h: number): Draft {
  const box = boxOf(draft, selection)
  if (!box) return draft
  const { min } = boxLimits[selection.type]
  // Grow only as far as the grid lets the box stay where it is.
  const width = Math.min(w, GRID.width - box.x)
  const height = Math.min(h, GRID.height - box.y)
  return setBox(draft, selection, { ...box, w: Math.max(width, min), h: Math.max(height, min) })
}

/** The selection grown or shrunk by dw, dh cells from its top left, within its sides and the grid. */
export function resizeBy(draft: Draft, selection: Selection, dw: number, dh: number): Draft {
  const box = boxOf(draft, selection)
  return box ? resizeTo(draft, selection, box.w + dw, box.h + dh) : draft
}
