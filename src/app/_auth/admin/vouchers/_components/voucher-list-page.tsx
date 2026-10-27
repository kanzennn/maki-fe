import { useSuspenseQuery } from '@tanstack/react-query'
import { getRouteApi, Link } from '@tanstack/react-router'
import { PlusIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/shared/button'

import { voucherListQuery } from '@/hooks/voucher/voucher.queries'
import { useUrlListState } from '@/hooks/use-url-list-state'
import { VoucherList } from '@/components/voucher/voucher-list'

const route = getRouteApi('/_auth/admin/vouchers/')

/** The Owner's vouchers: search by code or name, filter by status. */
export function VoucherListPage() {
  const { t } = useTranslation('voucher')
  const list = useUrlListState(route)
  const { data } = useSuspenseQuery(voucherListQuery(list.state))

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
      <VoucherList page={data} list={list} linked />
    </div>
  )
}
