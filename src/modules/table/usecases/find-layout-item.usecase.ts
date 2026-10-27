import type { Box, Draft, Selection } from '../types'

/** The selection's box in the draft; null when it isn't on the canvas. */
export function boxOf(draft: Draft, selection: Selection): Box | null {
  if (selection.type === 'table') return draft.tables.find((t) => t.tableId === selection.id)?.box ?? null
  return draft.decorations.find((d) => d.id === selection.id)?.box ?? null
}
