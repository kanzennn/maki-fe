import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { TableFloor, TableLegend, type FloorTable } from '@/shared/components/TableFloor'
import { cn } from '@/shared/lib/utils'

import type { PosFloor } from '../api'

/**
 * The outlet's floor at the cashier, an area at a time: the key, the area's
 * layout with its tables' statuses, and the tables not placed on it. Each
 * table canPick allows is a button; picked shows strongly, and its area is
 * the one shown first.
 */
export function FloorView({
  floor,
  onPick,
  canPick,
  picked,
}: {
  floor: PosFloor
  onPick: (table: FloorTable) => void
  canPick?: (table: FloorTable) => boolean
  picked?: string | null
}) {
  const { t } = useTranslation('pos')
  const [chosen, setChosen] = useState(
    () => floor.areas.find((a) => a.tables.some((table) => table.table_id === picked))?.area_id ?? null,
  )
  const area = floor.areas.find((a) => a.area_id === chosen) ?? floor.areas[0]
  if (!area) return null

  return (
    <div className="grid gap-3">
      {floor.areas.length > 1 && (
        <div role="group" aria-label={t('tables.areas')} className="flex flex-wrap gap-2">
          {floor.areas.map((a) => (
            <button
              key={a.area_id}
              type="button"
              aria-pressed={a.area_id === area.area_id}
              onClick={() => setChosen(a.area_id)}
              className={cn(
                'inline-flex h-11 items-center rounded-full border px-4 text-title-md whitespace-nowrap outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                a.area_id === area.area_id
                  ? 'border-primary bg-primary-container text-on-primary-container'
                  : 'border-outline bg-surface text-on-surface-variant hover:text-on-surface',
              )}
            >
              {a.name}
            </button>
          ))}
        </div>
      )}
      <TableLegend />
      <TableFloor
        label={t('tables.layout', { area: area.name })}
        decorations={area.decorations}
        tables={area.tables}
        onPick={onPick}
        canPick={canPick}
        picked={picked}
      />
    </div>
  )
}
