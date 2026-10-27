import { useSuspenseQuery } from '@tanstack/react-query'
import { getRouteApi, Link } from '@tanstack/react-router'
import { PlusIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { BackLink, PageHeader } from '@/components/shared/page-header'
import { Pagination } from '@/components/shared/pagination'
import { SelectField } from '@/components/shared/select-field'
import { useCan } from '@/hooks/use-can'
import { formatDateTimeRange, zoneName } from '@/lib/time'
import { Button } from '@/components/shared/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/shared/table'

import { ScheduleStatusBadge } from '@/components/table/schedule-status-badge'
import { scheduleListQuery } from '@/hooks/table/table.queries'
import { useUrlListState } from '@/hooks/use-url-list-state'
import { scheduleStatuses, type Schedule, type ScheduleStatus } from '@/modules/table/types'

const route = getRouteApi('/_auth/admin/outlets/$oid/tables/schedules/')

/** How many of a schedule's tables its row names before counting the rest. */
const NAMED = 3

/**
 * An outlet's table schedules, the latest first, filtered by status: the
 * times its tables are out of service on their own, in the outlet's zone.
 */
export function ScheduleListPage() {
  const { t, i18n } = useTranslation('table')
  const { t: tCommon } = useTranslation()
  const { oid } = route.useParams()
  const { state: search, filter, setPage } = useUrlListState(route)
  const can = useCan()
  const timeZone = route.useRouteContext({ select: (c) => c.outlet.timezone })
  const { data } = useSuspenseQuery(scheduleListQuery(oid, search))
  const locale = i18n.language

  const tables = (schedule: Schedule) => {
    const names = schedule.tables
      .slice(0, NAMED)
      .map((table) => (table.deleted ? t('schedules.deletedTable', { name: table.name }) : table.name))
      .join(', ')
    const rest = schedule.tables.length - NAMED
    return rest > 0 ? t('schedules.more', { names, count: rest }) : names
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        back={
          <BackLink to="/admin/outlets/$oid/tables" params={{ oid }}>
            {t('back')}
          </BackLink>
        }
        title={t('schedules.title')}
        description={t('schedules.intro', { zone: zoneName(timeZone, locale) })}
        actions={
          can('table.manage') && (
            <Button asChild className="h-11">
              <Link to="/admin/outlets/$oid/tables/schedules/new" params={{ oid }}>
                <PlusIcon aria-hidden="true" />
                {t('schedules.create')}
              </Link>
            </Button>
          )
        }
      />

      <div className="sm:max-w-xs">
        <SelectField
          label={tCommon('status.label')}
          value={search.status ?? ''}
          onChange={(event) => filter({ status: (event.target.value || undefined) as ScheduleStatus | undefined })}
        >
          <option value="">{tCommon('status.all')}</option>
          {scheduleStatuses.map((status) => (
            <option key={status} value={status}>
              {t(`schedules.status.${status}`)}
            </option>
          ))}
        </SelectField>
      </div>

      {data.items.length === 0 ? (
        <div className="grid justify-items-start gap-3 rounded-card border border-outline p-6">
          <p className="text-on-surface-variant">
            {data.total > 0
              ? tCommon('list.pastEnd')
              : search.status
                ? t('schedules.noMatch')
                : t('schedules.empty')}
          </p>
          {data.total > 0 && (
            <Button variant="outline" className="h-11" onClick={() => setPage(undefined)}>
              {tCommon('list.firstPage')}
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-card border border-outline bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('schedules.columns.title')}</TableHead>
                <TableHead className="hidden sm:table-cell">{t('schedules.columns.period')}</TableHead>
                <TableHead className="hidden expanded:table-cell">{t('schedules.columns.tables')}</TableHead>
                <TableHead>{t('schedules.columns.status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((schedule) => (
                <TableRow key={schedule.schedule_id}>
                  <TableCell>
                    <Link
                      to="/admin/outlets/$oid/tables/schedules/$sid"
                      params={{ oid, sid: schedule.schedule_id }}
                      className="text-title-md text-on-surface underline-offset-4 hover:underline"
                    >
                      {schedule.title}
                    </Link>
                    {/* Below 640px, the time it leaves out. */}
                    <p className="text-label-sm text-on-surface-variant sm:hidden">
                      {formatDateTimeRange(schedule.start_at, schedule.end_at, locale, timeZone)}
                    </p>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {formatDateTimeRange(schedule.start_at, schedule.end_at, locale, timeZone)}
                  </TableCell>
                  <TableCell className="hidden text-on-surface-variant expanded:table-cell">{tables(schedule)}</TableCell>
                  <TableCell>
                    <ScheduleStatusBadge status={schedule.status} />
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
