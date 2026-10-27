import { DoorOpenIcon, GripVerticalIcon, MinusIcon, MonitorIcon } from 'lucide-react'
import type { DragEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { SectionHeading } from '@/components/shared/page-heading'
import { Button } from '@/components/shared/button'

import type { DecorationKind, Draft } from '@/modules/table/types'
import { PALETTE_TYPE, type PaletteItem } from './layout-editor'

const decorationIcons = { wall: MinusIcon, cashier: MonitorIcon, door: DoorOpenIcon } as const

function dragStart(item: PaletteItem) {
  return (event: DragEvent) => {
    event.dataTransfer.setData(PALETTE_TYPE, JSON.stringify(item))
    event.dataTransfer.effectAllowed = 'copy'
  }
}

/**
 * The editor's side panel: the area's tables not on the layout yet, and the
 * decorations, each dragged onto the canvas or put in its first free spot
 * with its button.
 */
export function LayoutPalette({
  draft,
  onPlace,
  onAdd,
}: {
  draft: Draft
  onPlace: (tableId: string) => void
  onAdd: (kind: DecorationKind) => void
}) {
  const { t } = useTranslation('table')
  const { t: tCommon } = useTranslation()
  const unplaced = draft.tables.filter((table) => !table.box)

  return (
    <div className="grid content-start gap-6">
      <section aria-labelledby="palette-tables" className="grid gap-3">
        <SectionHeading id="palette-tables">{t('editor.unplacedTitle')}</SectionHeading>
        {unplaced.length === 0 ? (
          <p className="text-body-md text-on-surface-variant">{t('editor.allPlaced')}</p>
        ) : (
          <ul className="grid gap-2">
            {unplaced.map((table) => (
              <li
                key={table.tableId}
                draggable
                onDragStart={dragStart({ type: 'table', id: table.tableId })}
                className="flex min-h-11 cursor-grab items-center gap-2 rounded-control border border-outline bg-surface py-1 pr-1 pl-2"
              >
                <GripVerticalIcon aria-hidden="true" className="size-4 shrink-0 text-icon-muted" />
                <span className="min-w-0 flex-1 truncate text-title-md text-on-surface">{table.name}</span>
                <Button
                  variant="outline"
                  className="h-11"
                  aria-label={t('editor.placeTable', { name: table.name })}
                  onClick={() => onPlace(table.tableId)}
                >
                  {t('editor.place')}
                </Button>
              </li>
            ))}
          </ul>
        )}
        <p className="text-label-md text-on-surface-variant">{t('editor.newTables')}</p>
      </section>

      <section aria-labelledby="palette-decorations" className="grid gap-3">
        <SectionHeading id="palette-decorations">{t('editor.decorations')}</SectionHeading>
        <ul className="grid gap-2">
          {(['wall', 'cashier', 'door'] as const).map((kind) => {
            const Icon = decorationIcons[kind]
            return (
              <li
                key={kind}
                draggable
                onDragStart={dragStart({ type: 'decoration', kind })}
                className="flex min-h-11 cursor-grab items-center gap-2 rounded-control border border-outline bg-surface py-1 pr-1 pl-2"
              >
                <GripVerticalIcon aria-hidden="true" className="size-4 shrink-0 text-icon-muted" />
                <Icon aria-hidden="true" className="size-4 shrink-0 text-on-surface-variant" />
                <span className="min-w-0 flex-1 truncate text-body-md text-on-surface">
                  {tCommon(`floor.decoration.${kind}`)}
                </span>
                <Button
                  variant="outline"
                  className="h-11"
                  aria-label={t('editor.addDecoration', { name: tCommon(`floor.decoration.${kind}`) })}
                  onClick={() => onAdd(kind)}
                >
                  {t('editor.add')}
                </Button>
              </li>
            )
          })}
        </ul>
        <p className="text-label-md text-on-surface-variant">{t('editor.decorationsHint')}</p>
      </section>
    </div>
  )
}
