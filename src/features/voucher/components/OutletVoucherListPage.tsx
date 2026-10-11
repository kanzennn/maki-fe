import { useSuspenseQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { PageHeader } from '@/shared/components/PageHeader'
import { useSession } from '@/shared/lib/session'

import { outletVoucherListQuery } from '../api'
import { VoucherList } from './VoucherList'

const route = getRouteApi('/_auth/admin/outlets/$oid/vouchers')

/**
 * The vouchers an outlet's cashier can take, for its Manager to read: only
 * the Owner makes and changes them. The Owner opens them from here too.
 */
export function OutletVoucherListPage() {
  const { t } = useTranslation('voucher')
  const { oid } = route.useParams()
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const isOwner = useSession((s) => s.user?.is_owner ?? false)
  const { data } = useSuspenseQuery(outletVoucherListQuery(oid, search))

  return (
    <div className="grid gap-6">
      <PageHeader title={t('outletList.title')} description={t('outletList.intro')} />
      <VoucherList page={data} search={search} linked={isOwner} onSearch={(next) => void navigate({ search: next })} />
    </div>
  )
}
