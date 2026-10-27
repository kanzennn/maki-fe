import { useSuspenseQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { Pagination } from '@/components/shared/pagination'
import { formatRupiah } from '@/lib/money'
import { Badge } from '@/components/shared/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/shared/table'

import { redemptionsQuery } from '@/hooks/voucher/voucher.queries'
import { useUrlListState } from '@/hooks/use-url-list-state'
import { formatWib } from '@/components/voucher/voucher-format'

const route = getRouteApi('/_auth/admin/vouchers/$vid')

/**
 * The sales that used the voucher, in every outlet, newest first: when, where,
 * the receipt number and the discount. A voided sale gave its use back, and
 * says so.
 */
export function RedemptionList({ voucherId }: { voucherId: string }) {
  const { t, i18n } = useTranslation('voucher')
  const { state: search, setPage } = useUrlListState(route, { resetScroll: false })
  const { data } = useSuspenseQuery(redemptionsQuery(voucherId, search))
  const locale = i18n.language

  return (
    <section aria-labelledby="voucher-redemptions" className="grid gap-4">
      <h2 id="voucher-redemptions" className="text-headline-md text-on-surface">
        {t('redemptions.title')}
      </h2>
      {data.items.length === 0 ? (
        <p className="text-body-md text-on-surface-variant">
          {data.total > 0 ? t('redemptions.pastEnd') : t('redemptions.empty')}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-card border border-outline bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('redemptions.receipt')}</TableHead>
                <TableHead className="hidden sm:table-cell">{t('redemptions.when')}</TableHead>
                <TableHead className="hidden sm:table-cell">{t('redemptions.outlet')}</TableHead>
                <TableHead className="text-right">{t('redemptions.discount')}</TableHead>
                <TableHead className="hidden sm:table-cell">{t('columns.status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((use) => {
                const when = t('detail.wib', { time: formatWib(use.client_created_at, locale) })
                const status = (
                  <Badge variant={use.status === 'paid' ? 'outline' : 'secondary'}>
                    {t(`redemptions.status.${use.status}`)}
                  </Badge>
                )
                return (
                  <TableRow key={use.order_id}>
                    <TableCell>
                      <span className="grid gap-1">
                        <span className="text-label-md whitespace-nowrap text-on-surface sm:text-body-md">{use.order_no}</span>
                        {/* Below 640px, the columns it leaves out, under the number. */}
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-label-sm text-on-surface-variant sm:hidden">
                          <span>{when}</span>
                          <span>{use.outlet.name}</span>
                          {status}
                        </span>
                      </span>
                    </TableCell>
                    <TableCell className="hidden whitespace-nowrap sm:table-cell">{when}</TableCell>
                    <TableCell className="hidden sm:table-cell">{use.outlet.name}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">{formatRupiah(use.voucher_discount, locale)}</TableCell>
                    <TableCell className="hidden sm:table-cell">{status}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
      <Pagination list={data} onPage={setPage} />
    </section>
  )
}
