import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { BackLink, PageHeader } from '@/shared/components/PageHeader'

import { useCreateSchedule } from '../api'
import { ScheduleForm } from './ScheduleForm'

const route = getRouteApi('/_auth/admin/outlets/$oid/tables/schedules/new')

/** A new schedule; its page opens next. */
export function ScheduleCreatePage() {
  const { t } = useTranslation('table')
  const { oid } = route.useParams()
  const navigate = useNavigate()
  const create = useCreateSchedule(oid)

  return (
    <div className="grid gap-6">
      <PageHeader
        back={
          <BackLink to="/admin/outlets/$oid/tables/schedules" params={{ oid }}>
            {t('schedules.back')}
          </BackLink>
        }
        title={t('schedules.createTitle')}
        description={t('schedules.createIntro')}
      />
      <ScheduleForm
        outletId={oid}
        submitLabel={t('schedules.create')}
        onSubmit={async (input) => {
          const schedule = await create.mutateAsync(input)
          await navigate({
            to: '/admin/outlets/$oid/tables/schedules/$sid',
            params: { oid, sid: schedule.schedule_id },
          })
        }}
      />
    </div>
  )
}
