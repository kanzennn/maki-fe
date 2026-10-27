import type { Draft } from '../types'

/** The table off the canvas: it stays in the area, not placed. */
export function unplace(draft: Draft, tableId: string): Draft {
  return { ...draft, tables: draft.tables.map((t) => (t.tableId === tableId ? { ...t, box: null } : t)) }
}
