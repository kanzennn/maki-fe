import { useSuspenseQuery } from '@tanstack/react-query'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { BackLink, PageHeader } from '@/components/shared/page-header'

import { useUpdateVoucher, voucherQuery } from '@/hooks/voucher/voucher.queries'
import { VoucherForm } from '@/components/voucher/voucher-form'

const route = getRouteApi('/_auth/admin/vouchers/$vid_/edit')

export function VoucherEditPage() {
  const { t } = useTranslation('voucher')
  const { vid } = route.useParams()
  const navigate = useNavigate()
  const { data: voucher } = useSuspenseQuery(voucherQuery(vid))
  const update = useUpdateVoucher(vid)

  return (
    <div className="grid gap-6">
      <PageHeader
        back={
          <BackLink to="/admin/vouchers/$vid" params={{ vid }}>
            {voucher.code}
          </BackLink>
        }
        title={t('edit.title')}
      />
      <VoucherForm
        voucher={voucher}
        submitLabel={t('edit.submit')}
        onSubmit={async (values) => {
          await update.mutateAsync(values)
          await navigate({ to: '/admin/vouchers/$vid', params: { vid } })
        }}
      />
    </div>
  )
}
