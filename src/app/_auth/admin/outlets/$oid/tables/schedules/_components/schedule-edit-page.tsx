import { useSuspenseQuery } from '@tanstack/react-query'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { BackLink, PageHeader } from '@/components/shared/page-header'

import { ScheduleForm } from '@/components/table/schedule-form'
import { scheduleQuery, useUpdateSchedule } from '@/hooks/table/table.queries'

const route = getRouteApi('/_auth/admin/outlets/$oid/tables/schedules/$sid_/edit')

/** A change to a schedule that isn't over; one that is stays as it was. */
export function ScheduleEditPage() {
  const { t } = useTranslation('table')
  const { oid, sid } = route.useParams()
  const navigate = useNavigate()
  const { data: schedule } = useSuspenseQuery(scheduleQuery(oid, sid))
  const update = useUpdateSchedule(oid, sid)
  const closed = schedule.status === 'finished' || schedule.status === 'cancelled'

  return (
    <div className="grid gap-6">
      <PageHeader
        back={
          <BackLink to="/admin/outlets/$oid/tables/schedules/$sid" params={{ oid, sid }}>
            {schedule.title}
          </BackLink>
        }
        title={t('schedules.editTitle')}
      />
      {closed ? (
        <p className="rounded-card border border-outline p-6 text-on-surface-variant">{t('schedules.closed')}</p>
      ) : (
        <ScheduleForm
          outletId={oid}
          schedule={schedule}
          submitLabel={t('schedules.save')}
          onSubmit={async (submission) => {
            await update.mutateAsync(submission)
            await navigate({ to: '/admin/outlets/$oid/tables/schedules/$sid', params: { oid, sid } })
          }}
        />
      )}
    </div>
  )
}
