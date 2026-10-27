import { createFileRoute, redirect } from '@tanstack/react-router'

import { PageNotFound } from '@/components/shared/page-state'
import { scheduleQuery } from '@/hooks/table/table.queries'
import { canViewTables } from '@/modules/table/permissions'
import { orNotFound } from '@/providers/not-found'

import { ScheduleDetailPage } from './_components/schedule-detail-page'

export const Route = createFileRoute('/_auth/admin/outlets/$oid/tables/schedules/$sid')({
  beforeLoad: ({ context }) => {
    if (!canViewTables(context.auth.user())) throw redirect({ to: '/admin' })
  },
  loader: ({ context, params }) => orNotFound(context.queryClient.ensureQueryData(scheduleQuery(params.oid, params.sid))),
  component: ScheduleDetailPage,
  // Here rather than at the root, so the admin area stays around it.
  notFoundComponent: PageNotFound,
})
