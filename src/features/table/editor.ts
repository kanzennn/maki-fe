import { useTranslation } from 'react-i18next'

import type { DecorationKind } from './api'
import { boxOf, type Draft, type Selection } from './layout'

/** What the editor's palette drags onto the canvas: a table not placed yet, or a new decoration. */
export type PaletteItem = { type: 'table'; id: string } | { type: 'decoration'; kind: DecorationKind }

/** The drag's data type, so the canvas takes only the palette's items. */
export const PALETTE_TYPE = 'application/x-maki-layout'

/** The ID of the selection's element on the canvas, to focus it. */
export function itemId(selection: Selection) {
  return `layout-${selection.type}-${selection.id}`
}

/** An editor item in words: "Meja A1, x 2, y 3, 3 × 3 kotak". */
export function useDescribe() {
  const { t } = useTranslation('table')
  const { t: tCommon } = useTranslation()
  function name(draft: Draft, selection: Selection) {
    if (selection.type === 'table') {
      return t('editor.tableName', { name: draft.tables.find((table) => table.tableId === selection.id)?.name ?? '' })
    }
    const kind = draft.decorations.find((decoration) => decoration.id === selection.id)?.kind ?? 'wall'
    return tCommon(`floor.decoration.${kind}`)
  }
  function item(draft: Draft, selection: Selection) {
    const box = boxOf(draft, selection)
    return box ? t('editor.item', { name: name(draft, selection), ...box }) : name(draft, selection)
  }
  return { name, item }
}
