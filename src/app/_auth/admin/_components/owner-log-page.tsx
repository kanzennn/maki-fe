import { useSuspenseQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { LogFilters } from '@/components/log/log-filters'
import { LogTable } from '@/components/log/log-table'
import { PageHeader } from '@/components/shared/page-header'
import { Pagination } from '@/components/shared/pagination'
import { SelectField } from '@/components/shared/select-field'
import { ownerLogsQuery } from '@/hooks/log/log.queries'
import { allOutletsQuery } from '@/hooks/outlet/outlet.queries'
import { useUrlListState } from '@/hooks/use-url-list-state'
import { browserTimeZone } from '@/lib/time'

const route = getRouteApi('/_auth/admin/logs')

const SELF = '__self'

/** Every outlet's Log Action, the Owner's own too. */
export function OwnerLogPage() {
  const { t } = useTranslation('log')
  const { state, filter, setPage } = useUrlListState(route)
  const timeZone = browserTimeZone()
  const { data } = useSuspenseQuery(ownerLogsQuery(state, timeZone))
  const { data: outlets } = useSuspenseQuery(allOutletsQuery())

  return (
    <div className="grid gap-6">
      <PageHeader title={t('title')} description={t('intro')} />
      <LogFilters state={state} onFilter={filter}>
        <SelectField
          label={t('filters.outlet')}
          value={state.self ? SELF : (state.outlet ?? '')}
          onChange={(e) =>
            filter({
              self: e.target.value === SELF ? true : undefined,
              outlet: e.target.value && e.target.value !== SELF ? e.target.value : undefined,
            })
          }
        >
          <option value="">{t('filters.allOutlets')}</option>
          <option value={SELF}>{t('filters.self')}</option>
          {outlets.map((o) => (
            <option key={o.outlet_id} value={o.outlet_id}>
              {o.name}
            </option>
          ))}
        </SelectField>
      </LogFilters>
      {data.items.length === 0 ? (
        <p className="text-body-md text-on-surface-variant">{t('empty')}</p>
      ) : (
        <>
          <LogTable entries={data.items} timeZone={timeZone} showOutlet />
          <Pagination list={data} onPage={setPage} />
        </>
      )}
    </div>
  )
}
