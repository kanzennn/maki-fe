import { NEW_BOX_SIZE, type Draft } from '../types'
import { fitBox } from '../validations/layout.validation'
import { freeSpot } from './find-free-spot.usecase'

/**
 * The table placed on the canvas at its shape's size: with its top left at
 * at, or in the first free spot (the grid's top left when there is none).
 */
export function place(draft: Draft, tableId: string, at?: { x: number; y: number }): Draft {
  const table = draft.tables.find((t) => t.tableId === tableId)
  if (!table) return draft
  const { w, h } = NEW_BOX_SIZE[table.shape]
  const spot = at ?? freeSpot(draft, w, h) ?? { x: 0, y: 0 }
  return {
    ...draft,
    tables: draft.tables.map((t) => (t.tableId === tableId ? { ...t, box: fitBox({ ...spot, w, h }, 'table') } : t)),
  }
}
