import type { Box, Draft, Selection } from '../types'
import { fitBox } from '../validations/layout.validation'

/** The draft with the selection's box set, kept on the grid and within its sides. */
export function setBox(draft: Draft, selection: Selection, box: Box): Draft {
  if (selection.type === 'table') {
    return {
      ...draft,
      tables: draft.tables.map((t) => (t.tableId === selection.id && t.box ? { ...t, box: fitBox(box, 'table') } : t)),
    }
  }
  return {
    ...draft,
    decorations: draft.decorations.map((d) => (d.id === selection.id ? { ...d, box: fitBox(box, 'decoration') } : d)),
  }
}
