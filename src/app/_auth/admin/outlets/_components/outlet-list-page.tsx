import { useSuspenseQuery } from '@tanstack/react-query'
import { getRouteApi, Link } from '@tanstack/react-router'
import { PlusIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { PageHeader } from '@/components/shared/page-header'
import { Pagination } from '@/components/shared/pagination'
import { SearchField } from '@/components/shared/search-field'
import { SelectField } from '@/components/shared/select-field'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/shared/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/shared/table'

import { outletListQuery } from '@/hooks/outlet/outlet.queries'
import { useUrlListState } from '@/hooks/use-url-list-state'
import type { OutletStatus } from '@/modules/outlet/types'

const route = getRouteApi('/_auth/admin/outlets/')

/** The Owner's outlets: search by name or code, filter by status. */
export function OutletListPage() {
  const { t } = useTranslation('outlet')
  const { t: tCommon } = useTranslation()
  const { state: search, filter, setPage } = useUrlListState(route)
  const { data } = useSuspenseQuery(outletListQuery(search))
  const filtered = Boolean(search.q || search.status)

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

      {data.items.length === 0 ? (
        <div className="grid justify-items-start gap-3 rounded-card border border-outline p-6">
          <p className="text-on-surface-variant">
            {data.total > 0 ? tCommon('list.pastEnd') : filtered ? t('list.noMatch') : t('list.empty')}
          </p>
          {data.total > 0 && (
            <Button variant="outline" className="h-11" onClick={() => setPage(undefined)}>
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
              {data.items.map((outlet) => (
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

      <Pagination list={data} onPage={setPage} />
    </div>
  )
}
