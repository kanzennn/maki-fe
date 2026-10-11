import { describe, expect, it } from 'vitest'

import type { Layout } from './api'
import {
  addDecoration,
  draftFromLayout,
  freeSpot,
  GRID,
  moveBy,
  moveTo,
  overlapping,
  overlaps,
  place,
  removeDecoration,
  resizeBy,
  resizeTo,
  rotate,
  rotateTo,
  sameLayout,
  setBox,
  setShape,
  toLayoutInput,
  unplace,
  type Draft,
} from './layout'

function table(id: string, name: string, extra: Partial<Layout['tables'][number]> = {}): Layout['tables'][number] {
  return {
    table_id: id,
    area: { area_id: 'a1', name: 'Indoor' },
    name,
    capacity: null,
    shape: 'square',
    box: null,
    rotation: 0,
    is_active: true,
    status: 'available',
    seated: null,
    created_at: '2026-10-01T03:00:00Z',
    updated_at: '2026-10-01T03:00:00Z',
    ...extra,
  }
}

const layout: Layout = {
  area: { area_id: 'a1', name: 'Indoor' },
  version: 7,
  decorations: [{ kind: 'wall', x: 0, y: 31, w: 48, h: 1, rotation: 0 }],
  tables: [
    table('t1', 'A1', { box: { x: 2, y: 2, w: 3, h: 3 } }),
    table('t2', 'A2', { box: { x: 10, y: 2, w: 5, h: 3 }, shape: 'rectangle', rotation: 90 }),
    table('t3', 'A3'),
  ],
}

const a1 = { type: 'table', id: 't1' } as const
const a2 = { type: 'table', id: 't2' } as const
const wall = { type: 'decoration', id: 'd0' } as const

function boxOfTable(draft: Draft, id: string) {
  return draft.tables.find((t) => t.tableId === id)?.box
}

describe('a draft', () => {
  it("is the server's layout, and saves its placed tables and decorations", () => {
    const draft = draftFromLayout(layout)
    expect(draft.version).toBe(7)
    expect(draft.decorations).toEqual([{ id: 'd0', kind: 'wall', box: { x: 0, y: 31, w: 48, h: 1 }, rotation: 0 }])
    expect(toLayoutInput(draft)).toEqual({
      version: 7,
      tables: [
        { table_id: 't1', x: 2, y: 2, w: 3, h: 3, rotation: 0, shape: 'square' },
        { table_id: 't2', x: 10, y: 2, w: 5, h: 3, rotation: 90, shape: 'rectangle' },
      ],
      decorations: [{ kind: 'wall', x: 0, y: 31, w: 48, h: 1, rotation: 0 }],
    })
  })

  it('knows when it saves the same layout', () => {
    const draft = draftFromLayout(layout)
    expect(sameLayout(draft, draftFromLayout(layout))).toBe(true)
    expect(sameLayout(draft, moveBy(draft, a1, 1, 0))).toBe(false)
    // Moved and back again: nothing to save.
    expect(sameLayout(draft, moveBy(moveBy(draft, a1, 1, 0), a1, -1, 0))).toBe(true)
  })
})

describe('moving and resizing', () => {
  const draft = draftFromLayout(layout)

  it('moves a box by cells, stopping at the grid', () => {
    expect(boxOfTable(moveBy(draft, a1, 3, -1), 't1')).toEqual({ x: 5, y: 1, w: 3, h: 3 })
    expect(boxOfTable(moveBy(draft, a1, -10, -10), 't1')).toEqual({ x: 0, y: 0, w: 3, h: 3 })
    expect(boxOfTable(moveTo(draft, a1, 100, 100), 't1')).toEqual({ x: GRID.width - 3, y: GRID.height - 3, w: 3, h: 3 })
  })

  it('leaves a table that isn’t placed where it is', () => {
    expect(moveBy(draft, { type: 'table', id: 't3' }, 1, 1)).toBe(draft)
  })

  it('keeps a table 2 to 16 cells a side, and on the grid', () => {
    expect(boxOfTable(resizeBy(draft, a1, -5, 1), 't1')).toEqual({ x: 2, y: 2, w: 2, h: 4 })
    expect(boxOfTable(resizeBy(draft, a1, 20, 20), 't1')).toEqual({ x: 2, y: 2, w: 16, h: 16 })
    const corner = moveTo(draft, a1, 44, 28)
    expect(boxOfTable(resizeBy(corner, a1, 5, 5), 't1')).toEqual({ x: 44, y: 28, w: 4, h: 4 })
  })

  it('sizes a box from its top left, as far as the grid lets it stay there', () => {
    expect(boxOfTable(resizeTo(draft, a1, 6, 1), 't1')).toEqual({ x: 2, y: 2, w: 6, h: 2 })
    const corner = moveTo(draft, a1, 44, 28)
    expect(boxOfTable(resizeTo(corner, a1, 10, 10), 't1')).toEqual({ x: 44, y: 28, w: 4, h: 4 })
    expect(resizeTo(draft, { type: 'table', id: 't3' }, 5, 5)).toBe(draft)
  })

  it('lets a decoration be one cell, and the grid wide', () => {
    expect(resizeBy(draft, wall, -60, -5).decorations[0].box).toEqual({ x: 0, y: 31, w: 1, h: 1 })
    expect(setBox(draft, wall, { x: 0, y: 0, w: 60, h: 40 }).decorations[0].box).toEqual({ x: 0, y: 0, w: 48, h: 32 })
  })

  it('sets a box from typed numbers, kept within its limits', () => {
    expect(boxOfTable(setBox(draft, a1, { x: -3, y: 40, w: 1, h: 20 }), 't1')).toEqual({ x: 0, y: 16, w: 2, h: 16 })
  })
})

describe('turning and shapes', () => {
  const draft = draftFromLayout(layout)

  it('turns a quarter clockwise, swapping width and height, on the grid', () => {
    const turned = rotate(draft, a2)
    expect(turned.tables[1]).toMatchObject({ rotation: 180, box: { x: 10, y: 2, w: 3, h: 5 } })
    expect(rotate(rotate(turned, a2), a2).tables[1].rotation).toBe(0)
    // Turned at the bottom edge, it moves up to fit.
    const low = moveTo(draft, a2, 10, 29)
    expect(boxOfTable(rotate(low, a2), 't2')).toEqual({ x: 10, y: 27, w: 3, h: 5 })
    expect(rotate(draft, wall).decorations[0]).toMatchObject({ rotation: 90, box: { x: 0, y: 0, w: 1, h: 32 } })
  })

  it('turns to a rotation a quarter at a time, either way round', () => {
    const turned = rotateTo(draft, a2, 0)
    expect(turned.tables[1]).toMatchObject({ rotation: 0, box: { x: 10, y: 2, w: 3, h: 5 } })
    expect(rotateTo(draft, a2, 270).tables[1]).toMatchObject({ rotation: 270, box: { w: 5, h: 3 } })
    expect(rotateTo(draft, a2, 90)).toEqual(draft)
    expect(rotateTo(draft, wall, 180).decorations[0]).toMatchObject({ rotation: 180, box: { w: 48, h: 1 } })
    expect(rotateTo(draft, { type: 'table', id: 'nope' }, 90)).toEqual(draft)
    expect(rotateTo(draft, { type: 'table', id: 't3' }, 90).tables[2]).toMatchObject({ rotation: 0, box: null })
  })

  it('makes a square or round table as wide as it is tall, and a square one wider as a rectangle', () => {
    expect(setShape(draft, 't2', 'round').tables[1]).toMatchObject({ shape: 'round', box: { x: 10, y: 2, w: 3, h: 3 } })
    expect(setShape(draft, 't1', 'rectangle').tables[0]).toMatchObject({ shape: 'rectangle', box: { x: 2, y: 2, w: 5, h: 3 } })
    // A rectangle already stays as it is.
    expect(setShape(draft, 't2', 'rectangle').tables[1].box).toEqual({ x: 10, y: 2, w: 5, h: 3 })
    expect(setShape(draft, 't3', 'round').tables[2]).toMatchObject({ shape: 'round', box: null })
  })
})

describe('placing', () => {
  const draft = draftFromLayout(layout)

  it('puts a table at its shape’s size in the first spot free of tables and decorations', () => {
    const placed = place(draft, 't3')
    expect(boxOfTable(placed, 't3')).toEqual({ x: 5, y: 0, w: 3, h: 3 })
    expect(overlapping(placed).size).toBe(0)
  })

  it('keeps clear of a decoration where it can, and takes a rectangle’s size', () => {
    const walled: Draft = {
      ...draft,
      decorations: [{ id: 'd0', kind: 'wall', box: { x: 0, y: 0, w: 48, h: 1 }, rotation: 0 }],
    }
    expect(boxOfTable(place(walled, 't3'), 't3')).toEqual({ x: 5, y: 1, w: 3, h: 3 })
    const long = setShape(draft, 't3', 'rectangle')
    expect(boxOfTable(place(long, 't3'), 't3')).toEqual({ x: 5, y: 0, w: 5, h: 3 })
  })

  it('puts it where it is dropped, on the grid', () => {
    expect(boxOfTable(place(draft, 't3', { x: 46, y: 30 }), 't3')).toEqual({ x: 45, y: 29, w: 3, h: 3 })
  })

  it('takes it off the canvas again', () => {
    expect(boxOfTable(unplace(draft, 't1'), 't1')).toBeNull()
    expect(toLayoutInput(unplace(draft, 't1')).tables.map((t) => t.table_id)).toEqual(['t2'])
  })

  it('finds a spot over a decoration when nothing else is free', () => {
    const full: Draft = {
      version: 1,
      tables: [{ tableId: 'big', name: 'Big', shape: 'square', box: { x: 0, y: 0, w: 48, h: 29 }, rotation: 0 }],
      decorations: [{ id: 'd0', kind: 'wall', box: { x: 0, y: 29, w: 48, h: 3 }, rotation: 0 }],
    }
    expect(freeSpot(full, 3, 3)).toEqual({ x: 0, y: 29 })
    expect(freeSpot(full, 3, 4)).toBeNull()
  })
})

describe('overlaps', () => {
  it('share a cell; touching edges don’t', () => {
    expect(overlaps({ x: 0, y: 0, w: 3, h: 3 }, { x: 2, y: 2, w: 3, h: 3 })).toBe(true)
    expect(overlaps({ x: 0, y: 0, w: 3, h: 3 }, { x: 3, y: 0, w: 3, h: 3 })).toBe(false)
    expect(overlaps({ x: 0, y: 0, w: 3, h: 3 }, { x: 0, y: 3, w: 3, h: 3 })).toBe(false)
  })

  it('names the tables on top of one another; a decoration under one doesn’t count', () => {
    const draft = draftFromLayout(layout)
    expect([...overlapping(moveTo(draft, a2, 3, 3))].sort()).toEqual(['t1', 't2'])
    expect(overlapping(moveTo(draft, a1, 0, 30)).size).toBe(0)
  })
})

describe('decorations', () => {
  it('are added at their size in a free spot, under IDs of their own, and removed', () => {
    const draft = draftFromLayout(layout)
    const { draft: withDoor, id } = addDecoration(draft, 'door')
    expect(id).toBe('d1')
    // One row high, it fits above A1.
    expect(withDoor.decorations[1]).toEqual({ id: 'd1', kind: 'door', box: { x: 0, y: 0, w: 3, h: 1 }, rotation: 0 })
    const { id: next } = addDecoration(removeDecoration(withDoor, 'd0'), 'cashier')
    expect(next).toBe('d2')
    expect(removeDecoration(withDoor, 'd0').decorations.map((d) => d.kind)).toEqual(['door'])
  })
})
