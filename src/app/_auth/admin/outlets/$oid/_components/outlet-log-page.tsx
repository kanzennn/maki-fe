import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { LogFilters } from '@/components/log/log-filters'
import { LogTable } from '@/components/log/log-table'
import { PageHeader } from '@/components/shared/page-header'
import { Pagination } from '@/components/shared/pagination'
import { SelectField } from '@/components/shared/select-field'
import { outletLogsQuery } from '@/hooks/log/log.queries'
import { useUrlListState } from '@/hooks/use-url-list-state'
import { useSession } from '@/hooks/use-session'
import { staffListQuery } from '@/hooks/user/staff.queries'
import { canViewStaff } from '@/modules/user/permissions'

const route = getRouteApi('/_auth/admin/outlets/$oid/logs')

/** One outlet's Log Action. Who can't see its users filters by everything else. */
export function OutletLogPage() {
  const { t } = useTranslation('log')
  const { oid } = route.useParams()
  const { state, filter, setPage } = useUrlListState(route)
  const timeZone = route.useRouteContext({ select: (c) => c.outlet.timezone })
  const { data } = useSuspenseQuery(outletLogsQuery(oid, state, timeZone))
  const seesStaff = useSession((s) => canViewStaff(s.user))
  const staff = useQuery({ ...staffListQuery(oid, { page: undefined }), enabled: seesStaff })

  return (
    <div className="grid gap-6">
      <PageHeader title={t('title')} description={t('intro')} />
      <LogFilters state={state} onFilter={filter}>
        {seesStaff && (
          <SelectField
            label={t('filters.user')}
            value={state.user ?? ''}
            onChange={(e) => filter({ user: e.target.value || undefined })}
          >
            <option value="">{t('filters.allUsers')}</option>
            {staff.data?.items.map((u) => (
              <option key={u.user_id} value={u.user_id}>
                {u.name}
              </option>
            ))}
          </SelectField>
        )}
      </LogFilters>
      {data.items.length === 0 ? (
        <p className="text-body-md text-on-surface-variant">{t('empty')}</p>
      ) : (
        <>
          <LogTable entries={data.items} timeZone={timeZone} showOutlet={false} />
          <Pagination list={data} onPage={setPage} />
        </>
      )}
    </div>
  )
}
