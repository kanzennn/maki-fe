import { useQuery } from '@tanstack/react-query'
import { getRouteApi, Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { PageHeading } from '@/shared/components/PageHeading'
import { Pagination } from '@/shared/components/Pagination'
import { SearchField } from '@/shared/components/SearchField'
import { formatRupiah } from '@/shared/lib/money'
import { formatNumber } from '@/shared/lib/number'
import { useSession } from '@/shared/lib/session'
import { formatDate, formatTime } from '@/shared/lib/time'
import { Badge } from '@/shared/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

import { todayOrdersQuery, type OrderSummary } from '../api'

const route = getRouteApi('/_auth/pos/history/')

/**
 * Today's orders, in the outlet's time zone, newest first, voided ones
 * included: to find a receipt by part of its number, print it again, or void
 * it.
 */
export function HistoryPage() {
  const { t, i18n } = useTranslation('pos')
  const { outletId } = route.useRouteContext()
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const timeZone = useSession((s) => s.user?.outlet?.timezone ?? 'Asia/Jakarta')
  // Ensured by the loader; kept while a new search loads.
  const { data } = useQuery(todayOrdersQuery(outletId, search))
  const locale = i18n.language
  const money = (amount: number) => formatRupiah(amount, locale)

  return (
    <div className="grid content-start gap-4 p-4 expanded:p-6">
      <header className="grid gap-1">
        <PageHeading>{t('history.title')}</PageHeading>
        <p className="text-body-md text-on-surface-variant">{formatDate(new Date().toISOString(), locale, timeZone)}</p>
      </header>
      <div className="max-w-sm">
        <SearchField
          label={t('history.search')}
          placeholder={t('history.searchPlaceholder')}
          value={search.q ?? ''}
          onSearch={(q) => void navigate({ search: { q: q || undefined } })}
        />
      </div>
      {data && data.data.length === 0 ? (
        <p className="text-body-md text-on-surface-variant">{search.q ? t('history.noMatch') : t('history.empty')}</p>
      ) : (
        data && (
          <>
            <div className="overflow-x-auto rounded-card border border-outline bg-surface">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="hidden sm:table-cell">{t('history.columns.time')}</TableHead>
                    <TableHead>{t('history.columns.number')}</TableHead>
                    <TableHead className="hidden sm:table-cell">{t('history.columns.table')}</TableHead>
                    <TableHead className="hidden text-right sm:table-cell">{t('history.columns.items')}</TableHead>
                    <TableHead className="text-right">{t('history.columns.total')}</TableHead>
                    <TableHead className="hidden sm:table-cell">{t('history.columns.cashier')}</TableHead>
                    <TableHead className="hidden sm:table-cell">{t('history.columns.status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((order) => (
                    <TableRow key={order.order_id}>
                      <TableCell className="hidden whitespace-nowrap sm:table-cell">
                        {formatTime(order.client_created_at, locale, timeZone)}
                      </TableCell>
                      <TableCell>
                        <span className="grid gap-1">
                          <Link
                            to="/pos/history/$orid"
                            params={{ orid: order.order_id }}
                            className="text-label-md whitespace-nowrap text-primary-strong underline-offset-4 hover:underline sm:text-title-md"
                          >
                            {order.order_no}
                          </Link>
                          {/* Below 640px, the columns it leaves out, under the number. */}
                          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-label-sm text-on-surface-variant sm:hidden">
                            <span>{formatTime(order.client_created_at, locale, timeZone)}</span>
                            {order.table_name && <span>{t('history.table', { name: order.table_name })}</span>}
                            {order.stand_number && <span>{t('history.stand', { number: order.stand_number })}</span>}
                            <span>{t('menu.items', { count: order.item_count })}</span>
                            <Status status={order.status} />
                          </span>
                        </span>
                      </TableCell>
                      {/* Where the order went: its table, or the number on its stand. */}
                      <TableCell className="hidden sm:table-cell">
                        {order.table_name ??
                          (order.stand_number ? (
                            t('history.stand', { number: order.stand_number })
                          ) : (
                            <span className="text-on-surface-variant">{t('history.noTable')}</span>
                          ))}
                      </TableCell>
                      <TableCell className="hidden text-right sm:table-cell">
                        {formatNumber(order.item_count, locale)}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">{money(order.total)}</TableCell>
                      <TableCell className="hidden sm:table-cell">{order.cashier.name}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Status status={order.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Pagination meta={data.meta} onPage={(page) => void navigate({ search: { ...search, page } })} />
          </>
        )
      )}
    </div>
  )
}

function Status({ status }: { status: OrderSummary['status'] }) {
  const { t } = useTranslation('pos')
  return <Badge variant={status === 'void' ? 'destructive' : 'secondary'}>{t(`history.status.${status}`)}</Badge>
}
