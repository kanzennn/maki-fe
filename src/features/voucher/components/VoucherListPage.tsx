import { useSuspenseQuery } from '@tanstack/react-query'
import { getRouteApi, Link } from '@tanstack/react-router'
import { PlusIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { PageHeader } from '@/shared/components/PageHeader'
import { Button } from '@/shared/ui/button'

import { voucherListQuery } from '../api'
import { VoucherList } from './VoucherList'

const route = getRouteApi('/_auth/admin/vouchers/')

/** The Owner's vouchers: search by code or name, filter by status. */
export function VoucherListPage() {
  const { t } = useTranslation('voucher')
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const { data } = useSuspenseQuery(voucherListQuery(search))

  return (
    <div className="grid gap-6">
      <PageHeader
        title={t('list.title')}
        description={t('list.intro')}
        actions={
          <Button asChild className="h-11">
            <Link to="/admin/vouchers/new">
              <PlusIcon aria-hidden="true" />
              {t('list.create')}
            </Link>
          </Button>
        }
      />
      <VoucherList page={data} search={search} linked onSearch={(next) => void navigate({ search: next })} />
    </div>
  )
}
