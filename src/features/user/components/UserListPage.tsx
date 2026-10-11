import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams, useRouteContext, useSearch } from '@tanstack/react-router'
import { PlusIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { allRolesQuery } from '@/shared/api/roles'
import { PageHeader } from '@/shared/components/PageHeader'
import { Pagination } from '@/shared/components/Pagination'
import { SearchField } from '@/shared/components/SearchField'
import { SelectField } from '@/shared/components/SelectField'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { useCan } from '@/shared/hooks/useCan'
import { useSession } from '@/shared/lib/session'
import { formatDateTime } from '@/shared/lib/time'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

import { staffListQuery, type StaffSearch, type StaffStatus } from '../api'

/** An outlet's accounts: search by name or username, filter by role and status. */
export function UserListPage() {
  const { t, i18n } = useTranslation('user')
  const { t: tCommon } = useTranslation()
  const { oid } = useParams({ from: '/_auth/admin/outlets/$oid/users/' })
  const search = useSearch({ from: '/_auth/admin/outlets/$oid/users/' })
  const navigate = useNavigate({ from: '/admin/outlets/$oid/users/' })
  const outlet = useRouteContext({ from: '/_auth/admin/outlets/$oid', select: (c) => c.outlet })
  const isOwner = useSession((s) => s.user?.is_owner ?? false)
  const can = useCan()
  const { data } = useSuspenseQuery(staffListQuery(oid, search))
  const { data: roles } = useSuspenseQuery(allRolesQuery(oid))
  const filtered = Boolean(search.q || search.status || search.role_id)

  // A new filter starts again from the first page.
  function filter(next: Omit<StaffSearch, 'page'>) {
    void navigate({ search: (prev) => ({ ...prev, ...next, page: undefined }) })
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        title={t('list.title')}
        actions={
          can('user.manage') && (
            <Button asChild className="h-11">
              <Link to="/admin/outlets/$oid/users/new" params={{ oid }}>
                <PlusIcon aria-hidden="true" />
                {isOwner ? t('list.createManager') : t('list.create')}
              </Link>
            </Button>
          )
        }
      />

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_12rem]">
        <SearchField
          label={t('list.search')}
          placeholder={t('list.searchPlaceholder')}
          value={search.q ?? ''}
          onSearch={(q) => filter({ q: q || undefined })}
        />
        <SelectField
          label={t('fields.role')}
          value={search.role_id ?? ''}
          onChange={(e) => filter({ role_id: e.target.value || undefined })}
        >
          <option value="">{t('list.allRoles')}</option>
          {roles.map((role) => (
            <option key={role.role_id} value={role.role_id}>
              {role.name}
            </option>
          ))}
        </SelectField>
        <SelectField
          label={tCommon('status.label')}
          value={search.status ?? ''}
          onChange={(e) => filter({ status: (e.target.value || undefined) as StaffStatus | undefined })}
        >
          <option value="">{tCommon('status.all')}</option>
          <option value="active">{tCommon('status.active')}</option>
          <option value="inactive">{tCommon('status.inactive')}</option>
        </SelectField>
      </div>

      {data.data.length === 0 ? (
        <div className="grid justify-items-start gap-3 rounded-card border border-outline p-6">
          <p className="text-on-surface-variant">
            {data.meta.total > 0 ? tCommon('list.pastEnd') : filtered ? t('list.noMatch') : t('list.empty')}
          </p>
          {data.meta.total > 0 && (
            <Button
              variant="outline"
              className="h-11"
              onClick={() => void navigate({ search: (prev) => ({ ...prev, page: undefined }) })}
            >
              {tCommon('list.firstPage')}
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-card border border-outline">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('fields.name')}</TableHead>
                <TableHead>{t('fields.role')}</TableHead>
                <TableHead>{tCommon('status.label')}</TableHead>
                <TableHead className="hidden md:table-cell">{t('fields.lastLogin')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((staff) => (
                <TableRow key={staff.user_id}>
                  <TableCell>
                    <Link
                      to="/admin/outlets/$oid/users/$uid"
                      params={{ oid, uid: staff.user_id }}
                      className="text-title-md text-on-surface underline-offset-4 hover:underline"
                    >
                      {staff.name}
                    </Link>
                    <p className="text-label-md text-on-surface-variant">@{staff.username}</p>
                  </TableCell>
                  <TableCell>
                    {staff.is_manager ? <Badge>{t('manager')}</Badge> : (staff.role?.name ?? t('noRole'))}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={staff.status} />
                  </TableCell>
                  <TableCell className="hidden text-on-surface-variant md:table-cell">
                    {staff.last_login_at
                      ? formatDateTime(staff.last_login_at, i18n.language, outlet.timezone)
                      : t('neverSignedIn')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Pagination meta={data.meta} onPage={(page) => void navigate({ search: (prev) => ({ ...prev, page }) })} />
    </div>
  )
}
