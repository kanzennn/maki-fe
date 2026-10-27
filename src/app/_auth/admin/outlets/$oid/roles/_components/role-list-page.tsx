import { useSuspenseQuery } from '@tanstack/react-query'
import { getRouteApi, Link, useParams } from '@tanstack/react-router'
import { PlusIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { PageHeader } from '@/components/shared/page-header'
import { Pagination } from '@/components/shared/pagination'
import { useCan } from '@/hooks/use-can'
import { Button } from '@/components/shared/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/shared/table'

import { roleListQuery } from '@/hooks/role/role.queries'
import { useUrlListState } from '@/hooks/use-url-list-state'

const route = getRouteApi('/_auth/admin/outlets/$oid/roles/')

/** An outlet's custom roles, with how many permissions and users each has. */
export function RoleListPage() {
  const { t } = useTranslation('role')
  const { oid } = useParams({ from: '/_auth/admin/outlets/$oid/roles/' })
  const { state: search, setPage } = useUrlListState(route)
  const can = useCan()
  const { data } = useSuspenseQuery(roleListQuery(oid, search))

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

      {data.items.length === 0 ? (
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
              {data.items.map((role) => (
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

      <Pagination list={data} onPage={setPage} />
    </div>
  )
}
