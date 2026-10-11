import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { PlusIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { PageHeader } from '@/shared/components/PageHeader'
import { Pagination } from '@/shared/components/Pagination'
import { SearchField } from '@/shared/components/SearchField'
import { SelectField } from '@/shared/components/SelectField'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { Button } from '@/shared/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

import { outletListQuery, type OutletSearch, type OutletStatus } from '../api'

/** The Owner's outlets: search by name or code, filter by status. */
export function OutletListPage() {
  const { t } = useTranslation('outlet')
  const { t: tCommon } = useTranslation()
  const search = useSearch({ from: '/_auth/admin/outlets/' })
  const navigate = useNavigate({ from: '/admin/outlets/' })
  const { data } = useSuspenseQuery(outletListQuery(search))
  const filtered = Boolean(search.q || search.status)

  // A new filter starts again from the first page.
  function filter(next: Omit<OutletSearch, 'page'>) {
    void navigate({ search: (prev) => ({ ...prev, ...next, page: undefined }) })
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        title={t('list.title')}
        actions={
          <Button asChild className="h-11">
            <Link to="/admin/outlets/new">
              <PlusIcon aria-hidden="true" />
              {t('list.create')}
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <SearchField
          label={t('list.search')}
          placeholder={t('list.searchPlaceholder')}
          value={search.q ?? ''}
          onSearch={(q) => filter({ q: q || undefined })}
        />
        <SelectField
          label={tCommon('status.label')}
          value={search.status ?? ''}
          onChange={(e) => filter({ status: (e.target.value || undefined) as OutletStatus | undefined })}
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
            <Button variant="outline" className="h-11" onClick={() => void navigate({ search: (prev) => ({ ...prev, page: undefined }) })}>
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
                <TableHead className="hidden sm:table-cell">{t('list.managers')}</TableHead>
                <TableHead>{tCommon('status.label')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((outlet) => (
                <TableRow key={outlet.outlet_id}>
                  <TableCell>
                    <Link
                      to="/admin/outlets/$oid"
                      params={{ oid: outlet.outlet_id }}
                      className="text-title-md text-on-surface underline-offset-4 hover:underline"
                    >
                      {outlet.name}
                    </Link>
                    <p className="text-label-md text-on-surface-variant">{outlet.code}</p>
                  </TableCell>
                  <TableCell className="hidden text-on-surface-variant sm:table-cell">
                    {outlet.managers.length > 0 ? outlet.managers.map((m) => m.name).join(', ') : t('list.noManager')}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={outlet.status} />
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
