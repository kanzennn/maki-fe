import { useSuspenseQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { PageHeader } from '@/components/shared/page-header'
import { useSession } from '@/hooks/use-session'

import { outletVoucherListQuery } from '@/hooks/voucher/voucher.queries'
import { useUrlListState } from '@/hooks/use-url-list-state'
import { VoucherList } from '@/components/voucher/voucher-list'

const route = getRouteApi('/_auth/admin/outlets/$oid/vouchers')

/**
 * The vouchers an outlet's cashier can take, for its Manager to read: only
 * the Owner makes and changes them. The Owner opens them from here too.
 */
export function OutletVoucherListPage() {
  const { t } = useTranslation('voucher')
  const { oid } = route.useParams()
  const list = useUrlListState(route)
  const isOwner = useSession((s) => s.user?.is_owner ?? false)
  const { data } = useSuspenseQuery(outletVoucherListQuery(oid, list.state))

  return (
    <div className="grid gap-6">
      <PageHeader title={t('outletList.title')} description={t('outletList.intro')} />
      <VoucherList page={data} list={list} linked={isOwner} />
    </div>
  )
}
