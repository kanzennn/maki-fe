import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { BackLink, PageHeader } from '@/components/shared/page-header'

import { useCreateVoucher } from '@/hooks/voucher/voucher.queries'
import { VoucherForm } from '@/components/voucher/voucher-form'

/** A new voucher; its page opens next. */
export function VoucherCreatePage() {
  const { t } = useTranslation('voucher')
  const navigate = useNavigate()
  const create = useCreateVoucher()

  return (
    <div className="grid gap-6">
      <PageHeader
        back={<BackLink to="/admin/vouchers">{t('detail.back')}</BackLink>}
        title={t('create.title')}
        description={t('create.intro')}
      />
      <VoucherForm
        submitLabel={t('create.submit')}
        onSubmit={async (values) => {
          const voucher = await create.mutateAsync(values)
          await navigate({ to: '/admin/vouchers/$vid', params: { vid: voucher.voucher_id } })
        }}
      />
    </div>
  )
}
