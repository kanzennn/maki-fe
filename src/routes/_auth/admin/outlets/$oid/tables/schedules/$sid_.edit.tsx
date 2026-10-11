import { createFileRoute, redirect } from '@tanstack/react-router'

import { allAreasQuery, allTablesQuery, scheduleQuery } from '@/features/table/api'
import { ScheduleEditPage } from '@/features/table/components/ScheduleEditPage'
import { PageNotFound } from '@/shared/components/PageState'
import { orNotFound } from '@/shared/lib/not-found'
import { can } from '@/shared/lib/permissions'

// A form of its own, with the way back to the schedule.
export const Route = createFileRoute('/_auth/admin/outlets/$oid/tables/schedules/$sid_/edit')({
  beforeLoad: ({ context }) => {
    if (!can(context.auth.user(), 'table.manage')) throw redirect({ to: '/admin' })
  },
  loader: ({ context, params }) =>
    orNotFound(
      Promise.all([
        context.queryClient.ensureQueryData(scheduleQuery(params.oid, params.sid)),
        context.queryClient.ensureQueryData(allAreasQuery(params.oid)),
        context.queryClient.ensureQueryData(allTablesQuery(params.oid)),
      ]),
    ),
  component: ScheduleEditPage,
  // Here rather than at the root, so the admin area stays around it.
  notFoundComponent: PageNotFound,
})
