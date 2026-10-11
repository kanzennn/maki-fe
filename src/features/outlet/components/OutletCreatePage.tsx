import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { BackLink, PageHeader } from '@/shared/components/PageHeader'

import { useCreateOutlet } from '../api'
import { OutletForm } from './OutletForm'

/** A new outlet, opened with its cashier role; its page opens next, to add a Manager. */
export function OutletCreatePage() {
  const { t } = useTranslation('outlet')
  const navigate = useNavigate()
  const create = useCreateOutlet()

  return (
    <div className="grid gap-6">
      <PageHeader
        back={<BackLink to="/admin/outlets">{t('detail.back')}</BackLink>}
        title={t('create.title')}
        description={t('create.intro')}
      />
      <OutletForm
        submitLabel={t('create.submit')}
        onSubmit={async (input) => {
          const outlet = await create.mutateAsync(input)
          await navigate({ to: '/admin/outlets/$oid', params: { oid: outlet.outlet_id } })
        }}
      />
    </div>
  )
}
