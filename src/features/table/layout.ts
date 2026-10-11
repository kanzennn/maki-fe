import { FLOOR } from '@/shared/lib/floor'

import type { DecorationKind, Layout, LayoutInput, TableShape } from './api'

/**
 * The layout editor's rules, apart from any component: an area's canvas is a
 * grid of GRID cells, a table is a box of TABLE_SIDE cells a side on it, a
 * decoration one cell up to the whole grid. Every change keeps a box on the
 * grid and within its sides, as the server's checks do; tables that overlap
 * stay possible while editing, and block the save.
 */
export const GRID = { width: FLOOR.width, height: FLOOR.height } as const
export const TABLE_SIDE = { min: 2, max: 16 } as const

export type Box = { x: number; y: number; w: number; h: number }
export type Rotation = 0 | 90 | 180 | 270

/** A table as the editor holds it: placed on the canvas (box) or not. */
export type EditorTable = { tableId: string; name: string; shape: TableShape; box: Box | null; rotation: Rotation }

/** A decoration as the editor holds it, under an ID of the draft's own. */
export type EditorDecoration = { id: string; kind: DecorationKind; box: Box; rotation: Rotation }

/** A layout being edited, and the version it was opened on. */
export type Draft = { version: number; tables: EditorTable[]; decorations: EditorDecoration[] }

/** What the editor has selected: a table, or a decoration. */
export type Selection = { type: 'table'; id: string } | { type: 'decoration'; id: string }

type Limits = { min: number; maxW: number; maxH: number }

const tableLimits: Limits = { min: TABLE_SIDE.min, maxW: TABLE_SIDE.max, maxH: TABLE_SIDE.max }
const decorationLimits: Limits = { min: 1, maxW: GRID.width, maxH: GRID.height }

/** A new box's size: a round or square table 3×3, a rectangle 5×3; a wall 8×1, the cashier 4×2, a door 3×1. */
export function defaultSize(of: TableShape | DecorationKind): { w: number; h: number } {
  switch (of) {
    case 'rectangle':
      return { w: 5, h: 3 }
    case 'wall':
      return { w: 8, h: 1 }
    case 'cashier':
      return { w: 4, h: 2 }
    case 'door':
      return { w: 3, h: 1 }
    default:
      return { w: 3, h: 3 }
  }
}

function asRotation(r: number): Rotation {
  return r === 90 || r === 180 || r === 270 ? r : 0
}

/** The editor's draft of a layout as the server answered it. */
export function draftFromLayout(layout: Layout): Draft {
  return {
    version: layout.version,
    tables: layout.tables.map((t) => ({
      tableId: t.table_id,
      name: t.name,
      shape: t.shape,
      box: t.box ? { ...t.box } : null,
      rotation: asRotation(t.rotation),
    })),
    decorations: layout.decorations.map((d, i) => ({
      id: `d${i}`,
      kind: d.kind,
      box: { x: d.x, y: d.y, w: d.w, h: d.h },
      rotation: asRotation(d.rotation),
    })),
  }
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

/** Whether two drafts save the same layout. */
export function sameLayout(a: Draft, b: Draft): boolean {
  return JSON.stringify(toLayoutInput(a)) === JSON.stringify(toLayoutInput(b))
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

/** The box with its sides within the limits, then moved back onto the grid. */
function clamp(box: Box, limits: Limits): Box {
  const w = Math.min(Math.max(Math.round(box.w), limits.min), limits.maxW)
  const h = Math.min(Math.max(Math.round(box.h), limits.min), limits.maxH)
  const x = Math.min(Math.max(Math.round(box.x), 0), GRID.width - w)
  const y = Math.min(Math.max(Math.round(box.y), 0), GRID.height - h)
  return { x, y, w, h }
}

/** The selection's box in the draft, and its limits; null when it isn't on the canvas. */
export function boxOf(draft: Draft, selection: Selection): Box | null {
  if (selection.type === 'table') return draft.tables.find((t) => t.tableId === selection.id)?.box ?? null
  return draft.decorations.find((d) => d.id === selection.id)?.box ?? null
}

/** The draft with the selection's box set, kept on the grid and within its sides. */
export function setBox(draft: Draft, selection: Selection, box: Box): Draft {
  if (selection.type === 'table') {
    return {
      ...draft,
      tables: draft.tables.map((t) => (t.tableId === selection.id && t.box ? { ...t, box: clamp(box, tableLimits) } : t)),
    }
  }
  return {
    ...draft,
    decorations: draft.decorations.map((d) =>
      d.id === selection.id ? { ...d, box: clamp(box, decorationLimits) } : d,
    ),
  }
}

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

/** The selection w × h cells from its top left, within its sides and the grid. */
export function resizeTo(draft: Draft, selection: Selection, w: number, h: number): Draft {
  const box = boxOf(draft, selection)
  if (!box) return draft
  const limits = selection.type === 'table' ? tableLimits : decorationLimits
  // Grow only as far as the grid lets the box stay where it is.
  const width = Math.min(w, GRID.width - box.x)
  const height = Math.min(h, GRID.height - box.y)
  return setBox(draft, selection, { ...box, w: Math.max(width, limits.min), h: Math.max(height, limits.min) })
}

/** The selection grown or shrunk by dw, dh cells from its top left, within its sides and the grid. */
export function resizeBy(draft: Draft, selection: Selection, dw: number, dh: number): Draft {
  const box = boxOf(draft, selection)
  return box ? resizeTo(draft, selection, box.w + dw, box.h + dh) : draft
}

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
        t.tableId === selection.id && t.box ? { ...t, rotation, box: clamp(turned(t.box, t.rotation), tableLimits) } : t,
      ),
    }
  }
  return {
    ...draft,
    decorations: draft.decorations.map((d) =>
      d.id === selection.id ? { ...d, rotation, box: clamp(turned(d.box, d.rotation), decorationLimits) } : d,
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

/**
 * The table in another shape: a square or round one takes its shorter side
 * for both, a rectangle made of a square grows two cells wider.
 */
export function setShape(draft: Draft, tableId: string, shape: TableShape): Draft {
  return {
    ...draft,
    tables: draft.tables.map((t) => {
      if (t.tableId !== tableId) return t
      if (!t.box) return { ...t, shape }
      const side = Math.min(t.box.w, t.box.h)
      const box =
        shape === 'rectangle'
          ? t.box.w === t.box.h
            ? { ...t.box, w: t.box.w + 2 }
            : t.box
          : { ...t.box, w: side, h: side }
      return { ...t, shape, box: clamp(box, tableLimits) }
    }),
  }
}

/**
 * The first top left cell, row by row from the grid's top left, where a box
 * of w × h cells overlaps no placed table nor decoration; failing that, no
 * placed table; null when there is none.
 */
export function freeSpot(draft: Draft, w: number, h: number): { x: number; y: number } | null {
  const tables = draft.tables.flatMap((t) => (t.box ? [t.box] : []))
  const decorations = draft.decorations.map((d) => d.box)
  for (const taken of [[...tables, ...decorations], tables]) {
    for (let y = 0; y + h <= GRID.height; y++) {
      for (let x = 0; x + w <= GRID.width; x++) {
        const box = { x, y, w, h }
        if (!taken.some((b) => overlaps(b, box))) return { x, y }
      }
    }
  }
  return null
}

/**
 * The table placed on the canvas at its shape's size: with its top left at
 * at, or in the first free spot (the grid's top left when there is none).
 */
export function place(draft: Draft, tableId: string, at?: { x: number; y: number }): Draft {
  const table = draft.tables.find((t) => t.tableId === tableId)
  if (!table) return draft
  const { w, h } = defaultSize(table.shape)
  const spot = at ?? freeSpot(draft, w, h) ?? { x: 0, y: 0 }
  return {
    ...draft,
    tables: draft.tables.map((t) => (t.tableId === tableId ? { ...t, box: clamp({ ...spot, w, h }, tableLimits) } : t)),
  }
}

/** The table off the canvas: it stays in the area, not placed. */
export function unplace(draft: Draft, tableId: string): Draft {
  return { ...draft, tables: draft.tables.map((t) => (t.tableId === tableId ? { ...t, box: null } : t)) }
}

/** A decoration of the kind added at its size, at at or in the first free spot; with its ID. */
export function addDecoration(
  draft: Draft,
  kind: DecorationKind,
  at?: { x: number; y: number },
): { draft: Draft; id: string } {
  const { w, h } = defaultSize(kind)
  const spot = at ?? freeSpot(draft, w, h) ?? { x: 0, y: 0 }
  // An ID no decoration of the draft has.
  let n = draft.decorations.length
  while (draft.decorations.some((d) => d.id === `d${n}`)) n++
  const id = `d${n}`
  return {
    draft: {
      ...draft,
      decorations: [...draft.decorations, { id, kind, box: clamp({ ...spot, w, h }, decorationLimits), rotation: 0 }],
    },
    id,
  }
}

export function removeDecoration(draft: Draft, id: string): Draft {
  return { ...draft, decorations: draft.decorations.filter((d) => d.id !== id) }
}
