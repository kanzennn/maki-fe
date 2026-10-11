import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router'
import { PlusIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { PageHeader } from '@/shared/components/PageHeader'
import { Pagination } from '@/shared/components/Pagination'
import { useCan } from '@/shared/hooks/useCan'
import { Button } from '@/shared/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

import { roleListQuery } from '../api'

/** An outlet's custom roles, with how many permissions and users each has. */
export function RoleListPage() {
  const { t } = useTranslation('role')
  const { oid } = useParams({ from: '/_auth/admin/outlets/$oid/roles/' })
  const { page } = useSearch({ from: '/_auth/admin/outlets/$oid/roles/' })
  const navigate = useNavigate({ from: '/admin/outlets/$oid/roles/' })
  const can = useCan()
  const { data } = useSuspenseQuery(roleListQuery(oid, page))

  return (
    <div className="grid gap-6">
      <PageHeader
        title={t('list.title')}
        description={t('list.intro')}
        actions={
          can('role.manage') && (
            <Button asChild className="h-11">
              <Link to="/admin/outlets/$oid/roles/new" params={{ oid }}>
                <PlusIcon aria-hidden="true" />
                {t('list.create')}
              </Link>
            </Button>
          )
        }
      />

      {data.data.length === 0 ? (
        <p className="rounded-card border border-outline p-6 text-on-surface-variant">{t('list.empty')}</p>
      ) : (
        <div className="rounded-card border border-outline">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('fields.name')}</TableHead>
                <TableHead>{t('list.permissions')}</TableHead>
                <TableHead>{t('list.users')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((role) => (
                <TableRow key={role.role_id}>
                  <TableCell>
                    <Link
                      to="/admin/outlets/$oid/roles/$rid"
                      params={{ oid, rid: role.role_id }}
                      className="text-title-md text-on-surface underline-offset-4 hover:underline"
                    >
                      {role.name}
                    </Link>
                    {role.description && <p className="text-label-md text-on-surface-variant">{role.description}</p>}
                  </TableCell>
                  <TableCell className="text-on-surface-variant">
                    {t('list.permissionCount', { count: role.permissions.length })}
                  </TableCell>
                  <TableCell className="text-on-surface-variant">
                    {t('list.userCount', { count: role.user_count })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Pagination meta={data.meta} onPage={(next) => void navigate({ search: { page: next } })} />
    </div>
  )
}
