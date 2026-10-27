import { GRID, type Draft } from '../types'
import { overlaps } from '../validations/layout.validation'

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
