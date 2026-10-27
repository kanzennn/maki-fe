import { useSuspenseQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { BackLink, PageHeader } from '@/components/shared/page-header'

import { outletQuery, useUpdateOutlet } from '@/hooks/outlet/outlet.queries'
import { OutletForm } from '@/components/outlet/outlet-form'

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
        onSubmit={async (values) => {
          await update.mutateAsync(values)
          await navigate({ to: '/admin/outlets/$oid', params: { oid } })
        }}
      />
    </div>
  )
}
