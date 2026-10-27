import type { Box, Draft, Rotation, Selection } from '../types'
import { asRotation, fitBox } from '../validations/layout.validation'

/**
 * The selection turned to rotation: a quarter turn either way swaps its
 * box's width and height, a half turn keeps them; kept on the grid. A table
 * that isn't placed stays as it is.
 */
export function rotateTo(draft: Draft, selection: Selection, rotation: Rotation): Draft {
  const turned = (box: Box, from: Rotation): Box =>
    ((rotation - from) / 90) % 2 === 0 ? box : { ...box, w: box.h, h: box.w }
  if (selection.type === 'table') {
    return {
      ...draft,
      tables: draft.tables.map((t) =>
        t.tableId === selection.id && t.box ? { ...t, rotation, box: fitBox(turned(t.box, t.rotation), 'table') } : t,
      ),
    }
  }
  return {
    ...draft,
    decorations: draft.decorations.map((d) =>
      d.id === selection.id ? { ...d, rotation, box: fitBox(turned(d.box, d.rotation), 'decoration') } : d,
    ),
  }
}

/** The selection turned a quarter clockwise: its box swaps width and height, kept on the grid. */
export function rotate(draft: Draft, selection: Selection): Draft {
  const current =
    selection.type === 'table'
      ? draft.tables.find((t) => t.tableId === selection.id)?.rotation
      : draft.decorations.find((d) => d.id === selection.id)?.rotation
  return current === undefined ? draft : rotateTo(draft, selection, asRotation((current + 90) % 360))
}
