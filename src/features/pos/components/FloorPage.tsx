import { useSuspenseQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { FormNotice } from '@/shared/components/FormMessage'
import { PageHeading } from '@/shared/components/PageHeading'

import { catalogQuery, floorQuery } from '../api'
import { FloorView } from './FloorView'
import { TableDetail } from './TableDetail'

const route = getRouteApi('/_auth/pos/tables')

/**
 * The cashier's tables: the outlet's floor as it is now, an area at a time,
 * with each table's status. A table opens its detail, to order at it or to
 * release it once its customers have gone. Where the outlet seats its
 * customers by number stands, the page says so instead.
 */
export function FloorPage() {
  const { t } = useTranslation('pos')
  const { outletId } = route.useRouteContext()
  const { data: floor } = useSuspenseQuery(floorQuery(outletId))
  const { data: catalog } = useSuspenseQuery(catalogQuery(outletId))
  const [open, setOpen] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const area = floor.areas.find((a) => a.tables.some((table) => table.table_id === open))
  const table = area?.tables.find((t) => t.table_id === open) ?? null

  return (
    <div className="grid content-start gap-4 p-4 expanded:p-6">
      <header className="grid gap-1">
        <PageHeading>{t('tables.title')}</PageHeading>
        {catalog.dine_in_mode !== 'number' && (
          <p className="text-body-md text-on-surface-variant">{t('tables.intro')}</p>
        )}
      </header>
      {notice && <FormNotice>{notice}</FormNotice>}
      {catalog.dine_in_mode === 'number' || floor.areas.length === 0 ? (
        <p className="rounded-card border border-outline p-6 text-on-surface-variant">
          {catalog.dine_in_mode === 'number' ? t('tables.numberMode') : t('tables.empty')}
        </p>
      ) : (
        <FloorView
          floor={floor}
          picked={open}
          onPick={(picked) => {
            setNotice(null)
            setOpen(picked.table_id)
          }}
        />
      )}
      <TableDetail
        outletId={outletId}
        table={table}
        area={area?.name ?? ''}
        onClose={() => setOpen(null)}
        onDone={setNotice}
      />
    </div>
  )
}
