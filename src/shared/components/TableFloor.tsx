import { BanIcon, ClockIcon, UsersIcon } from 'lucide-react'
import { useId, type KeyboardEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import type { components } from '@/shared/api/schema'
import { EXPANDED, useMediaQuery } from '@/shared/hooks/useMediaQuery'
import { FLOOR } from '@/shared/lib/floor'
import { cn } from '@/shared/lib/utils'
import { Badge } from '@/shared/ui/badge'

import { ZoomPan } from './ZoomPan'

export type FloorTable = components['schemas']['FloorTable']
export type FloorDecoration = components['schemas']['Decoration']
export type FloorTableStatus = components['schemas']['TableStatus']

const statusIcon = { occupied: UsersIcon, inactive: BanIcon, scheduled: ClockIcon } as const

/** How a table shows its status: a tint, a border and an icon, never the tint alone. */
const statusStyle: Record<FloorTableStatus, { shape: string; text: string; icon: string; dashed?: boolean }> = {
  available: { shape: 'fill-surface stroke-icon-muted', text: 'fill-on-surface', icon: '' },
  occupied: {
    shape: 'fill-primary-container stroke-primary',
    text: 'fill-on-primary-container',
    icon: 'text-on-primary-container',
  },
  inactive: {
    shape: 'fill-surface-container stroke-icon-muted',
    text: 'fill-on-surface-variant',
    icon: 'text-on-surface-variant',
    dashed: true,
  },
  scheduled: {
    shape: 'fill-surface-container stroke-icon-muted',
    text: 'fill-on-surface-variant',
    icon: 'text-on-surface-variant',
    dashed: true,
  },
}

/** A table's status in words, its tint and icon backing them up. */
export function TableStatusBadge({ status }: { status: FloorTableStatus }) {
  const { t } = useTranslation()
  const Icon = status === 'available' ? null : statusIcon[status]
  return (
    <Badge variant={status === 'available' ? 'outline' : status === 'occupied' ? 'default' : 'secondary'}>
      {Icon && <Icon aria-hidden="true" />}
      {t(`floor.status.${status}`)}
    </Badge>
  )
}

/** What the floor's tints and icons mean. */
export function TableLegend() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-label-md text-on-surface-variant">{t('floor.legend')}</span>
      {(['available', 'occupied', 'inactive', 'scheduled'] as const).map((status) => (
        <TableStatusBadge key={status} status={status} />
      ))}
    </div>
  )
}

/**
 * A table drawn in its box: its shape, its name, and its status's tint and
 * icon. The drawing is in the floor's units, a cell FLOOR.cell wide.
 */
export function TableMark({
  table,
  status,
  selected = false,
  warn = false,
  focusRing = false,
}: {
  table: Pick<FloorTable, 'name' | 'shape' | 'capacity'> & { box: NonNullable<FloorTable['box']> }
  status: FloorTableStatus
  /** Picked, or being edited: a strong ring. */
  selected?: boolean
  /** On top of another table: the editor's warning ring. */
  warn?: boolean
  /**
   * In a focusable group: the keyboard's focus ring around the box, apart
   * from the table so it never reads as picked, and not there for a tap.
   */
  focusRing?: boolean
}) {
  const { t } = useTranslation()
  const { box } = table
  const w = box.w * FLOOR.cell
  const h = box.h * FLOOR.cell
  const style = statusStyle[status]
  const Icon = status === 'available' ? null : statusIcon[status]
  // Inset, so the border sits inside the box and neighbours stay apart.
  const inset = 3
  const shapeProps = {
    className: cn(style.shape, warn && 'stroke-error', selected && 'stroke-primary-strong'),
    strokeWidth: selected || warn ? 3 : 1.5,
    strokeDasharray: style.dashed && !selected && !warn ? '5 3' : undefined,
  }
  const small = box.w < 3 || box.h < 3
  const ring = 'hidden fill-none stroke-primary group-focus-visible:inline'
  return (
    <g transform={`translate(${box.x * FLOOR.cell} ${box.y * FLOOR.cell})`}>
      {focusRing &&
        (table.shape === 'round' ? (
          <ellipse cx={w / 2} cy={h / 2} rx={w / 2 + 1} ry={h / 2 + 1} className={ring} strokeWidth={2} />
        ) : (
          <rect
            x={-1}
            y={-1}
            width={w + 2}
            height={h + 2}
            rx={table.shape === 'square' ? 10 : 7}
            className={ring}
            strokeWidth={2}
          />
        ))}
      {table.shape === 'round' ? (
        <ellipse cx={w / 2} cy={h / 2} rx={w / 2 - inset} ry={h / 2 - inset} {...shapeProps} />
      ) : (
        <rect
          x={inset}
          y={inset}
          width={w - inset * 2}
          height={h - inset * 2}
          rx={table.shape === 'square' ? 8 : 5}
          {...shapeProps}
        />
      )}
      <text
        x={w / 2}
        y={small || table.capacity === null ? h / 2 : h / 2 - 5}
        textAnchor="middle"
        dominantBaseline="central"
        className={cn('text-[13px] font-semibold', style.text)}
      >
        {table.name}
      </text>
      {!small && table.capacity !== null && (
        <text x={w / 2} y={h / 2 + 10} textAnchor="middle" dominantBaseline="central" className={cn('text-[10px]', style.text)}>
          {t('floor.seats', { count: table.capacity })}
        </text>
      )}
      {Icon && <Icon x={w - 17} y={5} width={12} height={12} className={style.icon} aria-hidden="true" />}
    </g>
  )
}

/** A decoration drawn in its box: a wall filled, the cashier and a door outlined and named. */
export function DecorationMark({ decoration, selected = false }: { decoration: FloorDecoration; selected?: boolean }) {
  const { t } = useTranslation()
  const w = decoration.w * FLOOR.cell
  const h = decoration.h * FLOOR.cell
  const label = decoration.kind === 'wall' ? null : t(`floor.decoration.${decoration.kind}`)
  return (
    <g transform={`translate(${decoration.x * FLOOR.cell} ${decoration.y * FLOOR.cell})`}>
      <rect
        width={w}
        height={h}
        rx={decoration.kind === 'wall' ? 2 : 4}
        className={cn(
          decoration.kind === 'wall' ? 'fill-icon-muted stroke-icon-muted' : 'fill-surface-container stroke-icon-muted',
          selected && 'stroke-primary-strong',
        )}
        strokeWidth={selected ? 3 : 1}
        strokeDasharray={decoration.kind === 'door' ? '4 3' : undefined}
      />
      {label && w >= 40 && (
        <text
          x={w / 2}
          y={h / 2}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-on-surface-variant text-[10px]"
        >
          {label}
        </text>
      )}
    </g>
  )
}

/** The grid's background: a cell's lines, every FLOOR.cell. */
export function FloorGrid({ children }: { children?: ReactNode }) {
  const pattern = useId()
  return (
    <>
      <defs>
        <pattern id={pattern} width={FLOOR.cell} height={FLOOR.cell} patternUnits="userSpaceOnUse">
          <path d={`M ${FLOOR.cell} 0 L 0 0 0 ${FLOOR.cell}`} className="fill-none stroke-outline" strokeWidth={1} />
        </pattern>
      </defs>
      <rect width={FLOOR.width * FLOOR.cell} height={FLOOR.height * FLOOR.cell} className="fill-surface-container-low" />
      <rect width={FLOOR.width * FLOOR.cell} height={FLOOR.height * FLOOR.cell} fill={`url(#${pattern})`} />
      {children}
    </>
  )
}

/**
 * An area's floor as its tables stand now: its decorations, and its placed
 * tables in their shapes with their statuses; the tables not placed are
 * listed below it. Read-only, unless onPick: then each table canPick allows
 * is a button, by pointer and by keyboard, picked shows strongly, and the
 * keyboard's focus is a ring around the table. Below
 * 840px the drawing keeps a cell 15px wide at least, so a table is a
 * finger's target, and pans and zooms (DESIGN.md).
 */
export function TableFloor({
  label,
  decorations,
  tables,
  onPick,
  canPick = () => true,
  picked,
}: {
  /** What the floor is, for whoever can't see it: "Layout Indoor". */
  label: string
  decorations: FloorDecoration[]
  tables: FloorTable[]
  onPick?: (table: FloorTable) => void
  canPick?: (table: FloorTable) => boolean
  picked?: string | null
}) {
  const { t } = useTranslation()
  const narrow = !useMediaQuery(EXPANDED)
  const placed = tables.filter((table) => table.box)
  const unplaced = tables.filter((table) => !table.box)
  const tableLabel = (table: FloorTable) =>
    t(table.capacity === null ? 'floor.tableLabel' : 'floor.tableLabelSeats', {
      name: table.name,
      status: t(`floor.status.${table.status}`),
      seats: table.capacity === null ? '' : t('floor.seats', { count: table.capacity }),
    })
  const pick = (table: FloorTable) => (onPick && canPick(table) ? () => onPick(table) : undefined)
  const keys = (table: FloorTable) => (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      pick(table)?.()
    }
  }

  const drawing = (
    <svg
      viewBox={`0 0 ${FLOOR.width * FLOOR.cell} ${FLOOR.height * FLOOR.cell}`}
      role={onPick ? 'group' : 'img'}
      aria-label={label}
      className="h-auto w-full max-w-[60rem] rounded-card border border-outline"
    >
      <FloorGrid>
        {decorations.map((decoration, i) => (
          <DecorationMark key={i} decoration={decoration} />
        ))}
        {placed.map((table) => {
          const action = pick(table)
          const mark = (
            <TableMark
              table={{ ...table, box: table.box! }}
              status={table.status}
              selected={picked === table.table_id}
              focusRing={onPick !== undefined}
            />
          )
          return onPick ? (
            <g
              key={table.table_id}
              role="button"
              tabIndex={action ? 0 : -1}
              aria-label={tableLabel(table)}
              aria-disabled={action ? undefined : true}
              aria-pressed={picked === table.table_id}
              className={cn('group outline-none', action ? 'cursor-pointer' : 'cursor-not-allowed')}
              onClick={action}
              onKeyDown={keys(table)}
            >
              {mark}
            </g>
          ) : (
            <g key={table.table_id} aria-hidden="true">
              {mark}
            </g>
          )
        })}
      </FloorGrid>
    </svg>
  )

  return (
    <div className="grid gap-3">
      {narrow ? (
        <ZoomPan minWidth={FLOOR.width * 15} label={t('floor.zoomWhat')}>
          {drawing}
        </ZoomPan>
      ) : (
        drawing
      )}
      {unplaced.length > 0 && (
        <div className="grid gap-2">
          <p className="text-label-md text-on-surface-variant">{t('floor.unplaced')}</p>
          <ul className="flex flex-wrap gap-2">
            {unplaced.map((table) => {
              const action = pick(table)
              return (
                <li key={table.table_id}>
                  {onPick ? (
                    <button
                      type="button"
                      onClick={action}
                      disabled={!action}
                      aria-pressed={picked === table.table_id}
                      aria-label={tableLabel(table)}
                      className={cn(
                        'inline-flex min-h-11 items-center gap-2 rounded-control border px-3 text-title-md',
                        picked === table.table_id ? 'border-primary bg-primary-container text-on-primary-container' : 'border-outline',
                        'disabled:cursor-not-allowed disabled:bg-surface-container disabled:text-on-surface-variant',
                      )}
                    >
                      {table.name}
                      <TableStatusBadge status={table.status} />
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-2 rounded-control border border-outline px-3 py-2 text-title-md">
                      {table.name}
                      <TableStatusBadge status={table.status} />
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
