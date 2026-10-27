import { ValidationError } from '@/lib/validation'

import { GRID, TABLE_SIDE, type Box, type Draft, type EditorTable, type LayoutInput, type Rotation, type Selection } from '../types'

// The server's rules for a layout. Every change keeps a box on the grid and
// within its sides, as the server's checks do; tables that overlap stay
// possible while editing, and block the save.

type Limits = { min: number; maxW: number; maxH: number }

/** A box's sides: a table's TABLE_SIDE cells, a decoration's one cell up to the whole grid. */
export const boxLimits: Record<Selection['type'], Limits> = {
  table: { min: TABLE_SIDE.min, maxW: TABLE_SIDE.max, maxH: TABLE_SIDE.max },
  decoration: { min: 1, maxW: GRID.width, maxH: GRID.height },
}

/** The box with its sides within the item's limits, then moved back onto the grid. */
export function fitBox(box: Box, item: Selection['type']): Box {
  const limits = boxLimits[item]
  const w = Math.min(Math.max(Math.round(box.w), limits.min), limits.maxW)
  const h = Math.min(Math.max(Math.round(box.h), limits.min), limits.maxH)
  const x = Math.min(Math.max(Math.round(box.x), 0), GRID.width - w)
  const y = Math.min(Math.max(Math.round(box.y), 0), GRID.height - h)
  return { x, y, w, h }
}

/** A rotation the server takes, a quarter turn at a time; anything else is none. */
export function asRotation(r: number): Rotation {
  return r === 90 || r === 180 || r === 270 ? r : 0
}

/** Whether two boxes share a cell; touching edges don't. */
export function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
}

/** The placed tables that overlap another, by ID: the save waits until there are none. */
export function overlapping(draft: Draft): Set<string> {
  const placed = draft.tables.filter((t): t is EditorTable & { box: Box } => t.box !== null)
  const out = new Set<string>()
  for (const [i, a] of placed.entries()) {
    for (const b of placed.slice(i + 1)) {
      if (overlaps(a.box, b.box)) {
        out.add(a.tableId)
        out.add(b.tableId)
      }
    }
  }
  return out
}

/** The draft as the server saves it: the placed tables, and the decorations. */
export function toLayoutInput(draft: Draft): LayoutInput {
  return {
    version: draft.version,
    tables: draft.tables.flatMap((t) =>
      t.box ? [{ table_id: t.tableId, ...t.box, rotation: t.rotation, shape: t.shape }] : [],
    ),
    decorations: draft.decorations.map((d) => ({ kind: d.kind, ...d.box, rotation: d.rotation })),
  }
}

/** The draft for the API; a ValidationError on `tables` while placed tables overlap. */
export function validateLayout(draft: Draft): LayoutInput {
  if (overlapping(draft).size > 0) throw new ValidationError({ tables: 'overlap' })
  return toLayoutInput(draft)
}
