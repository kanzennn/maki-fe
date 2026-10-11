import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { PrinterIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { FormNotice } from '@/shared/components/FormMessage'
import { BackLink } from '@/shared/components/PageHeader'
import { PageHeading } from '@/shared/components/PageHeading'
import { useCan } from '@/shared/hooks/useCan'
import { useSession } from '@/shared/lib/session'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'

import { catalogQuery, orderQuery } from '../api'
import { usePrint } from '../print-context'
import { Receipt, type ReceiptOutlet } from './Receipt'
import { VoidDialog } from './VoidDialog'

const route = getRouteApi('/_auth/pos/history/$orid')

/**
 * One of today's orders, as its receipt: to print it again, and, with
 * order.void, to void it.
 */
export function OrderPage() {
  const { t } = useTranslation('pos')
  const { outletId } = route.useRouteContext()
  const { orid } = route.useParams()
  const { data: order } = useSuspenseQuery(orderQuery(outletId, orid))
  const can = useCan()
  const print = usePrint()
  const [notice, setNotice] = useState<string | null>(null)
  const sessionOutlet = useSession((s) => s.user?.outlet)
  // The receipt's address and phone are the catalog's, for whoever may load it.
  const catalog = useQuery({ ...catalogQuery(outletId), enabled: can('checkout.create') })
  const outlet: ReceiptOutlet = catalog.data
    ? {
        name: catalog.data.outlet.name,
        address: catalog.data.outlet.address,
        phone: catalog.data.outlet.phone,
        locale: catalog.data.outlet.locale,
        timezone: catalog.data.outlet.timezone,
      }
    : {
        name: sessionOutlet?.name ?? '',
        address: null,
        phone: null,
        locale: sessionOutlet?.locale ?? 'id',
        timezone: sessionOutlet?.timezone ?? 'Asia/Jakarta',
      }

  return (
    <div className="grid content-start gap-4 p-4 expanded:p-6">
      <BackLink to="/pos/history">{t('history.back')}</BackLink>
      <div className="flex flex-wrap items-center gap-3">
        <PageHeading>{order.order_no}</PageHeading>
        <Badge variant={order.status === 'void' ? 'destructive' : 'secondary'}>
          {t(`history.status.${order.status}`)}
        </Badge>
      </div>
      {notice && <FormNotice>{notice}</FormNotice>}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" className="h-11" onClick={() => print(order, outlet)}>
          <PrinterIcon aria-hidden="true" />
          {t('history.reprint')}
        </Button>
        {can('order.void') && order.status === 'paid' && (
          <VoidDialog
            outletId={outletId}
            order={order}
            onDone={() => setNotice(t('void.done', { number: order.order_no }))}
          />
        )}
      </div>
      <div className="max-w-sm rounded-card border border-outline bg-surface p-5">
        <Receipt order={order} outlet={outlet} />
      </div>
    </div>
  )
}
