import { useSuspenseQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { BackLink, PageHeader } from '@/components/shared/page-header'

import { permissionCatalogQuery, useCreateRole } from '@/hooks/role/role.queries'
import { RoleForm } from '@/components/role/role-form'

export function RoleCreatePage() {
  const { t } = useTranslation('role')
  const { oid } = useParams({ from: '/_auth/admin/outlets/$oid/roles/new' })
  const navigate = useNavigate()
  const { data: catalog } = useSuspenseQuery(permissionCatalogQuery())
  const create = useCreateRole(oid)

  return (
    <div className="grid gap-6">
      <PageHeader
        back={
          <BackLink to="/admin/outlets/$oid/roles" params={{ oid }}>
            {t('detail.back')}
          </BackLink>
        }
        title={t('create.title')}
      />
      <RoleForm
        groups={catalog.groups}
        submitLabel={t('create.submit')}
        onSubmit={async (values) => {
          await create.mutateAsync(values)
          await navigate({ to: '/admin/outlets/$oid/roles', params: { oid } })
        }}
      />
    </div>
  )
}
