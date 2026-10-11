import { useSuspenseQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { BackLink, PageHeader } from '@/shared/components/PageHeader'

import { outletQuery, useUpdateOutlet } from '../api'
import { OutletForm } from './OutletForm'

export function OutletEditPage() {
  const { t } = useTranslation('outlet')
  const { oid } = useParams({ from: '/_auth/admin/outlets/$oid_/edit' })
  const navigate = useNavigate()
  const { data: outlet } = useSuspenseQuery(outletQuery(oid))
  const update = useUpdateOutlet(oid)

  return (
    <div className="grid gap-6">
      <PageHeader
        back={
          <BackLink to="/admin/outlets/$oid" params={{ oid }}>
            {outlet.name}
          </BackLink>
        }
        title={t('edit.title')}
      />
      <OutletForm
        outlet={outlet}
        submitLabel={t('edit.submit')}
        onSubmit={async (input) => {
          await update.mutateAsync(input)
          await navigate({ to: '/admin/outlets/$oid', params: { oid } })
        }}
      />
    </div>
  )
}
