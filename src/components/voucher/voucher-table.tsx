import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { formatRupiah } from '@/lib/money'
import { formatNumber } from '@/lib/number'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/shared/table'

import type { Voucher } from '@/modules/voucher/types'
import { formatDiscount, formatWib } from './voucher-format'
import { VoucherStatusBadge } from './voucher-status-badge'

/**
 * The spec's voucher list: code, discount, outlets, used of the quota,
 * period in WIB and status. The Owner's rows open the voucher; a Manager's
 * are only to read.
 */
export function VoucherTable({ vouchers, linked }: { vouchers: Voucher[]; linked: boolean }) {
  const { t, i18n } = useTranslation('voucher')
  const locale = i18n.language
  const used = (voucher: Voucher) =>
    t('used', { used: formatNumber(voucher.used_count, locale), quota: formatNumber(voucher.quota, locale) })

  return (
    <div className="overflow-x-auto rounded-card border border-outline bg-surface">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('columns.code')}</TableHead>
            <TableHead>{t('columns.discount')}</TableHead>
            <TableHead className="hidden sm:table-cell">{t('columns.outlets')}</TableHead>
            <TableHead className="hidden sm:table-cell">{t('columns.used')}</TableHead>
            <TableHead className="hidden expanded:table-cell">{t('columns.period')}</TableHead>
            <TableHead>{t('columns.status')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vouchers.map((voucher) => (
            <TableRow key={voucher.voucher_id}>
              <TableCell>
                {linked ? (
                  <Link
                    to="/admin/vouchers/$vid"
                    params={{ vid: voucher.voucher_id }}
                    className="text-title-md text-on-surface underline-offset-4 hover:underline"
                  >
                    {voucher.code}
                  </Link>
                ) : (
                  <span className="text-title-md text-on-surface">{voucher.code}</span>
                )}
                {voucher.name && <p className="text-label-md text-on-surface-variant">{voucher.name}</p>}
              </TableCell>
              <TableCell>
                <span className="grid">
                  <span>{formatDiscount(voucher, locale)}</span>
                  {voucher.max_discount !== null && (
                    <span className="text-label-sm text-on-surface-variant sm:whitespace-nowrap">
                      {t('terms.max', { amount: formatRupiah(voucher.max_discount, locale) })}
                    </span>
                  )}
                  {voucher.min_spend !== null && (
                    <span className="text-label-sm text-on-surface-variant sm:whitespace-nowrap">
                      {t('terms.min', { amount: formatRupiah(voucher.min_spend, locale) })}
                    </span>
                  )}
                </span>
              </TableCell>
              <TableCell className="hidden text-on-surface-variant sm:table-cell">
                {voucher.all_outlets ? t('outlets.all') : voucher.outlets.map((o) => o.name).join(', ') || t('outlets.none')}
              </TableCell>
              <TableCell className="hidden whitespace-nowrap sm:table-cell">{used(voucher)}</TableCell>
              <TableCell className="hidden text-on-surface-variant expanded:table-cell">
                {voucher.start_at
                  ? t('period.range', { start: formatWib(voucher.start_at, locale), end: formatWib(voucher.expired_at, locale) })
                  : t('period.until', { end: formatWib(voucher.expired_at, locale) })}
              </TableCell>
              <TableCell>
                {/* Not in a grid: as a grid item the badge, which clips, would let the column shrink under it. */}
                <VoucherStatusBadge status={voucher.status} />
                {/* Below 640px, the use it leaves out. */}
                <p className="mt-1 text-label-sm whitespace-nowrap text-on-surface-variant sm:hidden">{used(voucher)}</p>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
