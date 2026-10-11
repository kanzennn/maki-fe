import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { BackLink, PageHeader } from '@/shared/components/PageHeader'

import { useCreateVoucher } from '../api'
import { VoucherForm } from './VoucherForm'

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
        onSubmit={async (input) => {
          const voucher = await create.mutateAsync(input)
          await navigate({ to: '/admin/vouchers/$vid', params: { vid: voucher.voucher_id } })
        }}
      />
    </div>
  )
}
