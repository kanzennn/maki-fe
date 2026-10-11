import { createFileRoute, redirect } from '@tanstack/react-router'

import { scheduleQuery } from '@/features/table/api'
import { ScheduleDetailPage } from '@/features/table/components/ScheduleDetailPage'
import { PageNotFound } from '@/shared/components/PageState'
import { orNotFound } from '@/shared/lib/not-found'
import { can } from '@/shared/lib/permissions'

export const Route = createFileRoute('/_auth/admin/outlets/$oid/tables/schedules/$sid')({
  beforeLoad: ({ context }) => {
    if (!can(context.auth.user(), 'table.view')) throw redirect({ to: '/admin' })
  },
  loader: ({ context, params }) => orNotFound(context.queryClient.ensureQueryData(scheduleQuery(params.oid, params.sid))),
  component: ScheduleDetailPage,
  // Here rather than at the root, so the admin area stays around it.
  notFoundComponent: PageNotFound,
})
