import type { Draft, TableShape } from '../types'
import { fitBox } from '../validations/layout.validation'

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
      return { ...t, shape, box: fitBox(box, 'table') }
    }),
  }
}
