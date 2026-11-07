import { useSuspenseQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/shared/badge'
import { Checkbox } from '@/components/shared/checkbox'
import { PageHeader } from '@/components/shared/page-header'
import { paymentMethodsQuery } from '@/hooks/payment/payment.queries'

const route = getRouteApi('/_auth/admin/outlets/$oid/payment-methods')

/**
 * The payment methods the outlet's cashier offers. For now nothing here can be
 * changed: cash stays on, because it is the one method that works offline, and
 * QRIS and debit aren't released yet, so each says why.
 */
export function PaymentMethodsPage() {
  const { t } = useTranslation('payment')
  const { oid } = route.useParams()
  const { data: methods } = useSuspenseQuery(paymentMethodsQuery(oid))

  return (
    <div className="grid gap-6">
      <PageHeader title={t('title')} description={t('intro')} />
      <ul className="grid gap-3">
        {methods.map((m) => (
          <li
            key={m.method}
            className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-outline bg-surface p-4"
          >
            <label className="flex items-center gap-3">
              <Checkbox checked={m.is_enabled} disabled />
              <span className="grid">
                <span className="text-title-md text-on-surface">{t(`methods.${m.method}`)}</span>
                <span className="text-label-md text-on-surface-variant">
                  {t(m.available ? 'locked.required' : 'locked.comingSoon')}
                </span>
              </span>
            </label>
            {!m.available && <Badge variant="secondary">{t('comingSoon')}</Badge>}
          </li>
        ))}
      </ul>
    </div>
  )
}
