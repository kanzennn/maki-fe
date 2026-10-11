import { createFileRoute, redirect } from '@tanstack/react-router'

import { allAreasQuery, allTablesQuery } from '@/features/table/api'
import { ScheduleCreatePage } from '@/features/table/components/ScheduleCreatePage'
import { can } from '@/shared/lib/permissions'

export const Route = createFileRoute('/_auth/admin/outlets/$oid/tables/schedules/new')({
  beforeLoad: ({ context }) => {
    if (!can(context.auth.user(), 'table.manage')) throw redirect({ to: '/admin' })
  },
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(allAreasQuery(params.oid)),
      context.queryClient.ensureQueryData(allTablesQuery(params.oid)),
    ]),
  component: ScheduleCreatePage,
})
