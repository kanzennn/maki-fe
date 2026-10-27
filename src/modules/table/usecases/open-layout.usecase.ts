import type { Draft, Layout } from '../types'
import { asRotation } from '../validations/layout.validation'

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
