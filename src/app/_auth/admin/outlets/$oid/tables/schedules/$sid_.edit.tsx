import { createFileRoute, redirect } from '@tanstack/react-router'

import { PageNotFound } from '@/components/shared/page-state'
import { allAreasQuery, allTablesQuery, scheduleQuery } from '@/hooks/table/table.queries'
import { canManageTables } from '@/modules/table/permissions'
import { orNotFound } from '@/providers/not-found'

import { ScheduleEditPage } from './_components/schedule-edit-page'

// A form of its own, with the way back to the schedule.
export const Route = createFileRoute('/_auth/admin/outlets/$oid/tables/schedules/$sid_/edit')({
  beforeLoad: ({ context }) => {
    if (!canManageTables(context.auth.user())) throw redirect({ to: '/admin' })
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
