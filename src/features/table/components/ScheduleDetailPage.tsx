import { useSuspenseQuery } from '@tanstack/react-query'
import { getRouteApi, Link } from '@tanstack/react-router'
import { PencilIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { Detail } from '@/shared/components/Detail'
import { FormNotice } from '@/shared/components/FormMessage'
import { BackLink, PageHeader } from '@/shared/components/PageHeader'
import { SectionHeading } from '@/shared/components/PageHeading'
import { useCan } from '@/shared/hooks/useCan'
import { formatDateTime, zoneName } from '@/shared/lib/time'
import { Button } from '@/shared/ui/button'

import { scheduleQuery, useCancelSchedule, type Schedule } from '../api'
import { ScheduleStatusBadge } from './ScheduleStatusBadge'

const route = getRouteApi('/_auth/admin/outlets/$oid/tables/schedules/$sid')

/** A schedule's tables by area, in the server's order: by area, then by name. */
function byArea(tables: Schedule['tables']) {
  const areas: { areaId: string; name: string; tables: Schedule['tables'] }[] = []
  for (const table of tables) {
    const last = areas.at(-1)
    if (last?.areaId === table.area.area_id) last.tables.push(table)
    else areas.push({ areaId: table.area.area_id, name: table.area.name, tables: [table] })
  }
  return areas
}

/**
 * One schedule: when its tables are out, which ones, who made it and who
 * cancelled it. While it isn't over, whoever manages tables changes or
 * cancels it; a cancelled one stays, as history.
 */
export function ScheduleDetailPage() {
  const { t, i18n } = useTranslation('table')
  const { oid, sid } = route.useParams()
  const can = useCan()
  const timeZone = route.useRouteContext({ select: (c) => c.outlet.timezone })
  const { data: schedule } = useSuspenseQuery(scheduleQuery(oid, sid))
  const cancel = useCancelSchedule(oid, sid)
  const [notice, setNotice] = useState<string | null>(null)
  const locale = i18n.language
  const zone = zoneName(timeZone, locale)
  const when = (iso: string) => t('schedules.inZone', { time: formatDateTime(iso, locale, timeZone), zone })
  const open = schedule.status === 'upcoming' || schedule.status === 'ongoing'

  return (
    <div className="grid gap-6">
      <PageHeader
        back={
          <BackLink to="/admin/outlets/$oid/tables/schedules" params={{ oid }}>
            {t('schedules.back')}
          </BackLink>
        }
        title={
          <span className="flex flex-wrap items-center gap-3">
            {schedule.title}
            <ScheduleStatusBadge status={schedule.status} />
          </span>
        }
        actions={
          can('table.manage') &&
          open && (
            <>
              <Button asChild variant="outline" className="h-11">
                <Link to="/admin/outlets/$oid/tables/schedules/$sid/edit" params={{ oid, sid }}>
                  <PencilIcon aria-hidden="true" />
                  {t('schedules.edit')}
                </Link>
              </Button>
              <ConfirmDialog
                trigger={
                  <Button variant="outline" className="h-11 text-error">
                    {t('schedules.cancel.action')}
                  </Button>
                }
                title={t('schedules.cancel.title', { title: schedule.title })}
                description={
                  schedule.status === 'ongoing' ? t('schedules.cancel.bodyOngoing') : t('schedules.cancel.body')
                }
                confirmLabel={t('schedules.cancel.action')}
                destructive
                onConfirm={async () => {
                  await cancel.mutateAsync()
                  setNotice(t('schedules.cancel.done', { title: schedule.title }))
                }}
              />
            </>
          )
        }
      />
      {notice && <FormNotice>{notice}</FormNotice>}

      <section aria-labelledby="schedule-details" className="grid gap-4 rounded-card border border-outline p-4 sm:p-6">
        <SectionHeading id="schedule-details">{t('schedules.details')}</SectionHeading>
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <Detail term={t('schedules.fields.start')}>{when(schedule.start_at)}</Detail>
          <Detail term={t('schedules.fields.end')}>{when(schedule.end_at)}</Detail>
          <Detail term={t('schedules.createdBy')}>
            {t('schedules.byAt', { name: schedule.created_by.name, time: when(schedule.created_at) })}
          </Detail>
          {schedule.cancelled_at && schedule.cancelled_by && (
            <Detail term={t('schedules.cancelledBy')}>
              {t('schedules.byAt', { name: schedule.cancelled_by.name, time: when(schedule.cancelled_at) })}
            </Detail>
          )}
        </dl>
      </section>

      <section aria-labelledby="schedule-tables" className="grid gap-4 rounded-card border border-outline p-4 sm:p-6">
        <SectionHeading id="schedule-tables">{t('schedules.tables', { count: schedule.tables.length })}</SectionHeading>
        <dl className="grid gap-4">
          {byArea(schedule.tables).map((area) => (
            <Detail key={area.areaId} term={area.name}>
              {area.tables
                .map((table) => (table.deleted ? t('schedules.deletedTable', { name: table.name }) : table.name))
                .join(', ')}
            </Detail>
          ))}
        </dl>
      </section>
    </div>
  )
}
