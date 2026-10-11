import { useSuspenseQuery } from '@tanstack/react-query'
import { useRouteContext } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { SectionHeading } from '@/shared/components/PageHeading'
import { Pagination } from '@/shared/components/Pagination'
import { formatChange, formatNumber } from '@/shared/lib/number'
import { formatDateTime } from '@/shared/lib/time'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

import { stockMovementsQuery, type StockMovement } from '../api'

/**
 * A menu's stock history, newest first: when, in the outlet's time zone, and
 * by whom; what kind of change and why; the change and the count it left.
 * A note is shown as it was typed. A menu that never tracked its stock has
 * none, and with hideEmpty says nothing about it.
 */
export function StockHistory({
  outletId,
  menuId,
  page,
  onPage,
  hideEmpty = false,
}: {
  outletId: string
  menuId: string
  page?: number
  onPage: (page: number) => void
  hideEmpty?: boolean
}) {
  const { t } = useTranslation('menu')
  const { data } = useSuspenseQuery(stockMovementsQuery(outletId, menuId, page))
  if (hideEmpty && data.meta.total === 0) return null

  return (
    <section aria-labelledby="menu-history" className="grid gap-3">
      <SectionHeading id="menu-history">{t('history.title')}</SectionHeading>
      {data.data.length === 0 ? (
        <p className="text-on-surface-variant">{t('history.empty')}</p>
      ) : (
        <div className="min-w-0 rounded-card border border-outline">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('history.when')}</TableHead>
                <TableHead>{t('history.what')}</TableHead>
                <TableHead>{t('history.change')}</TableHead>
                <TableHead>{t('history.after')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((movement) => (
                <MovementRow key={movement.stock_movement_id} movement={movement} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <Pagination meta={data.meta} onPage={onPage} />
    </section>
  )
}

function MovementRow({ movement }: { movement: StockMovement }) {
  const { t, i18n } = useTranslation('menu')
  const outlet = useRouteContext({ from: '/_auth/admin/outlets/$oid', select: (c) => c.outlet })
  // A starting count's reason is its type; a sale or void has none.
  const reason =
    movement.reason && movement.reason !== 'initial' ? t(`adjust.reasons.${movement.reason}`) : undefined

  return (
    <TableRow>
      <TableCell>
        <p className="text-on-surface">{formatDateTime(movement.created_at, i18n.language, outlet.timezone)}</p>
        <p className="text-label-md text-on-surface-variant">{t('history.by', { name: movement.user.name })}</p>
      </TableCell>
      <TableCell>
        <p className="text-on-surface">
          {[t(`history.types.${movement.type}`), reason].filter(Boolean).join(' · ')}
        </p>
        {movement.note && <p className="text-label-md text-on-surface-variant">{movement.note}</p>}
      </TableCell>
      <TableCell className="text-on-surface tabular-nums">{formatChange(movement.qty_change, i18n.language)}</TableCell>
      <TableCell className="text-on-surface tabular-nums">{formatNumber(movement.stock_after, i18n.language)}</TableCell>
    </TableRow>
  )
}
