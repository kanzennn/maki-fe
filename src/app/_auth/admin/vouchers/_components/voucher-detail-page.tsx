import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { getRouteApi, Link } from '@tanstack/react-router'
import { PencilIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { queryKeys } from '@/hooks/query-keys'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Detail } from '@/components/shared/detail'
import { FormNotice } from '@/components/shared/form-message'
import { BackLink, PageHeader } from '@/components/shared/page-header'
import { formatRupiah } from '@/lib/money'
import { formatNumber } from '@/lib/number'
import { Button } from '@/components/shared/button'

import { useDeleteVoucher, useSetVoucherActive, voucherQuery } from '@/hooks/voucher/voucher.queries'
import { formatDiscount, formatWib } from '@/components/voucher/voucher-format'
import { RedemptionList } from './redemption-list'
import { VoucherStatusBadge } from '@/components/voucher/voucher-status-badge'

const route = getRouteApi('/_auth/admin/vouchers/$vid')

/**
 * The Owner's view of one voucher: its terms, its status with turning it
 * on or off, deleting it while no sale has used it, and the sales that did.
 */
export function VoucherDetailPage() {
  const { t, i18n } = useTranslation('voucher')
  const { vid } = route.useParams()
  const navigate = route.useNavigate()
  const queryClient = useQueryClient()
  const { data: voucher } = useSuspenseQuery(voucherQuery(vid))
  const setActive = useSetVoucherActive(vid)
  const remove = useDeleteVoucher(vid)
  const [notice, setNotice] = useState<string | null>(null)
  const locale = i18n.language
  const money = (amount: number) => formatRupiah(amount, locale)

  return (
    <div className="grid gap-6">
      <PageHeader
        back={<BackLink to="/admin/vouchers">{t('detail.back')}</BackLink>}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {voucher.code}
            <VoucherStatusBadge status={voucher.status} />
          </span>
        }
        description={voucher.name ?? undefined}
        actions={
          <Button asChild variant="outline" className="h-11">
            <Link to="/admin/vouchers/$vid/edit" params={{ vid }}>
              <PencilIcon aria-hidden="true" />
              {t('detail.edit')}
            </Link>
          </Button>
        }
      />
      {notice && <FormNotice>{notice}</FormNotice>}

      <section aria-labelledby="voucher-terms" className="grid gap-4 rounded-card border border-outline p-4 sm:p-6">
        <h2 id="voucher-terms" className="text-headline-md text-on-surface">
          {t('detail.terms')}
        </h2>
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <Detail term={t('columns.discount')}>
            {formatDiscount(voucher, locale)}
            {voucher.max_discount !== null && ` · ${t('terms.max', { amount: money(voucher.max_discount) })}`}
          </Detail>
          <Detail term={t('fields.minSpend')}>
            {voucher.min_spend !== null ? money(voucher.min_spend) : t('detail.noMinSpend')}
          </Detail>
          <Detail term={t('columns.used')}>
            {t('used', { used: formatNumber(voucher.used_count, locale), quota: formatNumber(voucher.quota, locale) })}
          </Detail>
          <Detail term={t('columns.outlets')}>
            {voucher.all_outlets ? t('outlets.all') : voucher.outlets.map((o) => o.name).join(', ') || t('outlets.none')}
          </Detail>
          <Detail term={t('fields.startAt')}>
            {voucher.start_at ? t('detail.wib', { time: formatWib(voucher.start_at, locale) }) : t('detail.startsAtOnce')}
          </Detail>
          <Detail term={t('fields.expiredAt')}>{t('detail.wib', { time: formatWib(voucher.expired_at, locale) })}</Detail>
          <Detail term={t('detail.firstUsed')}>
            {voucher.first_used_at
              ? t('detail.wib', { time: formatWib(voucher.first_used_at, locale) })
              : t('detail.neverUsed')}
          </Detail>
        </dl>
      </section>

      <section aria-labelledby="voucher-status" className="grid gap-4 rounded-card border border-outline p-4 sm:p-6">
        <h2 id="voucher-status" className="text-headline-md text-on-surface">
          {t('detail.status')}
        </h2>
        <p className="text-on-surface-variant">{voucher.is_active ? t('detail.activeBody') : t('detail.inactiveBody')}</p>
        <div className="flex flex-wrap gap-2">
          {voucher.is_active ? (
            <ConfirmDialog
              trigger={
                <Button variant="outline" className="h-11">
                  {t('detail.deactivate')}
                </Button>
              }
              title={t('detail.deactivateTitle', { code: voucher.code })}
              description={t('detail.deactivateBody')}
              confirmLabel={t('detail.deactivate')}
              destructive
              onConfirm={async () => {
                await setActive.mutateAsync(false)
                setNotice(t('detail.deactivated'))
              }}
            />
          ) : (
            <ConfirmDialog
              trigger={<Button className="h-11">{t('detail.activate')}</Button>}
              title={t('detail.activateTitle', { code: voucher.code })}
              description={t('detail.activateBody')}
              confirmLabel={t('detail.activate')}
              onConfirm={async () => {
                await setActive.mutateAsync(true)
                setNotice(t('detail.activated'))
              }}
            />
          )}
          {!voucher.first_used_at && (
            <ConfirmDialog
              trigger={
                <Button variant="outline" className="h-11 text-error">
                  {t('detail.delete')}
                </Button>
              }
              title={t('detail.deleteTitle', { code: voucher.code })}
              description={t('detail.deleteBody')}
              confirmLabel={t('detail.delete')}
              destructive
              onConfirm={async () => {
                await remove.mutateAsync()
                await navigate({ to: '/admin/vouchers' })
                queryClient.removeQueries({ queryKey: queryKeys.vouchers.detail(vid) })
              }}
            />
          )}
        </div>
        {voucher.first_used_at && <p className="text-body-md text-on-surface-variant">{t('detail.usedCantDelete')}</p>}
      </section>

      <RedemptionList voucherId={vid} />
    </div>
  )
}
