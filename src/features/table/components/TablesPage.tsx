import { useSuspenseQuery } from '@tanstack/react-query'
import { getRouteApi, Link } from '@tanstack/react-router'
import { CalendarClockIcon, LayoutGridIcon, PlusIcon, Settings2Icon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { FormNotice } from '@/shared/components/FormMessage'
import { PageHeader } from '@/shared/components/PageHeader'
import { SectionHeading } from '@/shared/components/PageHeading'
import { TableFloor, TableLegend, TableStatusBadge } from '@/shared/components/TableFloor'
import { useCan } from '@/shared/hooks/useCan'
import { formatTime } from '@/shared/lib/time'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'

import { allAreasQuery, dineInModeQuery, layoutQuery, useSetTableActive, type Area, type Table } from '../api'
import { DeleteTableDialog } from './DeleteTableDialog'
import { DineInModeCard } from './DineInModeCard'
import { TableDialog } from './TableDialog'

const route = getRouteApi('/_auth/admin/outlets/$oid/tables/')

/**
 * An outlet's tables, an area at a time: its layout as the tables stand now,
 * and its tables with their statuses, under how the outlet seats its
 * dine-in customers. Whoever manages tables adds and changes them here,
 * picks that mode, and opens the layout editor and the areas; everyone
 * else, the Owner too, only reads. By number stands, the tables stay, for
 * the table mode again.
 */
export function TablesPage() {
  const { t } = useTranslation('table')
  const { oid } = route.useParams()
  const search = route.useSearch()
  const can = useCan()
  const { data: areas } = useSuspenseQuery(allAreasQuery(oid))
  const { data: mode } = useSuspenseQuery(dineInModeQuery(oid))
  const [notice, setNotice] = useState<string | null>(null)
  // An area the address names, else the first.
  const area = areas.find((a) => a.area_id === search.area) ?? areas[0]

  return (
    <div className="grid gap-6">
      <PageHeader
        title={t('page.title')}
        description={t('page.intro')}
        actions={
          <>
            <Button asChild variant="outline" className="h-11">
              <Link to="/admin/outlets/$oid/tables/schedules" params={{ oid }}>
                <CalendarClockIcon aria-hidden="true" />
                {t('page.schedules')}
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-11">
              <Link to="/admin/outlets/$oid/tables/areas" params={{ oid }}>
                <Settings2Icon aria-hidden="true" />
                {t('page.areas')}
              </Link>
            </Button>
            {can('table.manage') && area && (
              <TableDialog
                outletId={oid}
                areas={areas}
                areaId={area.area_id}
                onDone={setNotice}
                trigger={
                  <Button className="h-11">
                    <PlusIcon aria-hidden="true" />
                    {t('page.create')}
                  </Button>
                }
              />
            )}
          </>
        }
      />
      {notice && <FormNotice>{notice}</FormNotice>}
      <DineInModeCard outletId={oid} onDone={setNotice} />
      {mode === 'number' && (
        <p className="rounded-card border border-outline bg-surface-container-low p-4 text-body-md text-on-surface-variant">
          {t('mode.numberNotice')}
        </p>
      )}

      {area ? (
        <>
          <nav aria-label={t('page.areaTabs')}>
            <ul className="flex flex-wrap gap-2">
              {areas.map((a) => (
                <li key={a.area_id}>
                  <Link
                    to="/admin/outlets/$oid/tables"
                    params={{ oid }}
                    search={{ area: a.area_id }}
                    resetScroll={false}
                    aria-current={a.area_id === area.area_id ? 'page' : undefined}
                    aria-label={t('page.areaTab', { area: a.name, count: a.table_count })}
                    className={cn(
                      'inline-flex h-11 items-center gap-2 rounded-full border px-4 text-title-md whitespace-nowrap',
                      a.area_id === area.area_id
                        ? 'border-primary bg-primary-container text-on-primary-container'
                        : 'border-outline text-on-surface-variant hover:text-on-surface',
                    )}
                  >
                    {a.name}
                    <span className="text-label-md">{a.table_count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <AreaTables key={area.area_id} outletId={oid} area={area} areas={areas} onDone={setNotice} />
        </>
      ) : (
        <div className="grid justify-items-start gap-3 rounded-card border border-outline p-6">
          <p className="text-on-surface-variant">{can('table.manage') ? t('page.noAreas') : t('page.noAreasView')}</p>
          {can('table.manage') && (
            <Button asChild className="h-11">
              <Link to="/admin/outlets/$oid/tables/areas" params={{ oid }}>
                {t('page.areas')}
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

/** One area: its layout, read-only, and its tables. */
function AreaTables({
  outletId,
  area,
  areas,
  onDone,
}: {
  outletId: string
  area: Area
  areas: Area[]
  onDone: (notice: string) => void
}) {
  const { t, i18n } = useTranslation('table')
  const can = useCan()
  const timeZone = route.useRouteContext({ select: (c) => c.outlet.timezone })
  const { data: layout } = useSuspenseQuery(layoutQuery(outletId, area.area_id))
  const since = (iso: string) => formatTime(iso, i18n.language, timeZone)

  return (
    <>
      <section aria-labelledby="area-layout" className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionHeading id="area-layout">{t('layout.title', { area: area.name })}</SectionHeading>
          {can('table.manage') && (
            // The editor needs a wide screen; below 840px the layout is only shown.
            <Button asChild variant="outline" className="hidden h-11 expanded:inline-flex">
              <Link to="/admin/outlets/$oid/tables/layout/$aid" params={{ oid: outletId, aid: area.area_id }}>
                <LayoutGridIcon aria-hidden="true" />
                {t('layout.edit')}
              </Link>
            </Button>
          )}
        </div>
        <TableLegend />
        <TableFloor label={t('layout.label', { area: area.name })} decorations={layout.decorations} tables={layout.tables} />
        {can('table.manage') && <p className="text-label-md text-on-surface-variant expanded:hidden">{t('layout.wideOnly')}</p>}
      </section>

      <section aria-labelledby="area-tables" className="grid gap-4">
        <SectionHeading id="area-tables">{t('list.title', { area: area.name })}</SectionHeading>
        {layout.tables.length === 0 ? (
          <p className="rounded-card border border-outline p-6 text-on-surface-variant">{t('list.empty')}</p>
        ) : (
          <ul aria-labelledby="area-tables" className="grid rounded-card border border-outline">
            {layout.tables.map((table) => (
              <li key={table.table_id} className="flex flex-wrap items-center gap-3 border-b border-outline p-3 last:border-b-0">
                <div className="grid min-w-0 flex-1 gap-0.5">
                  <p className="text-title-md break-words text-on-surface">{table.name}</p>
                  <p className="text-label-md text-on-surface-variant">
                    {[
                      table.capacity === null ? t('list.noCapacity') : t('list.seats', { count: table.capacity }),
                      t(`shape.${table.shape}`),
                      ...(table.box ? [] : [t('list.unplaced')]),
                    ].join(' · ')}
                  </p>
                </div>
                <div className="grid justify-items-end gap-1 text-right">
                  <TableStatusBadge status={table.status} />
                  {table.seated && (
                    <p className="text-label-sm text-on-surface-variant">
                      {t('list.seated', { time: since(table.seated.since), count: table.seated.orders })}
                    </p>
                  )}
                  {/* Off once the cashier releases it (the spec). */}
                  {table.status === 'occupied' && !table.is_active && (
                    <p className="text-label-sm text-on-surface-variant">{t('list.offOnRelease')}</p>
                  )}
                </div>
                {can('table.manage') && (
                  <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                    <TableDialog
                      outletId={outletId}
                      areas={areas}
                      table={table}
                      onDone={onDone}
                      trigger={
                        <Button variant="outline" className="h-11">
                          {t('list.edit')}
                        </Button>
                      }
                    />
                    <ActiveButton outletId={outletId} table={table} onDone={onDone} />
                    <DeleteTableDialog outletId={outletId} table={table} onDone={onDone} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}

/** Turns a table on or off at the cashier; an occupied one goes off once it's released. */
function ActiveButton({ outletId, table, onDone }: { outletId: string; table: Table; onDone: (notice: string) => void }) {
  const { t } = useTranslation('table')
  const setActive = useSetTableActive(outletId, table.table_id)
  const copy = table.is_active ? 'deactivate' : 'activate'
  return (
    <ConfirmDialog
      trigger={
        // As wide either way, so the rows' buttons line up.
        <Button variant="outline" className="h-11 min-w-32">
          {t(`${copy}.action`)}
        </Button>
      }
      title={t(`${copy}.title`, { name: table.name })}
      description={
        table.is_active && table.status === 'occupied' ? t('deactivate.bodyOccupied') : t(`${copy}.body`)
      }
      confirmLabel={t(`${copy}.action`)}
      destructive={table.is_active}
      onConfirm={async () => {
        await setActive.mutateAsync(!table.is_active)
        onDone(t(`${copy}.done`, { name: table.name }))
      }}
    />
  )
}
