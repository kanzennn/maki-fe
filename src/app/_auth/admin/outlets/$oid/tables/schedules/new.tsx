import { createFileRoute, redirect } from '@tanstack/react-router'

import { allAreasQuery, allTablesQuery } from '@/hooks/table/table.queries'
import { canManageTables } from '@/modules/table/permissions'

import { ScheduleCreatePage } from './_components/schedule-create-page'

export const Route = createFileRoute('/_auth/admin/outlets/$oid/tables/schedules/new')({
  beforeLoad: ({ context }) => {
    if (!canManageTables(context.auth.user())) throw redirect({ to: '/admin' })
  },
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(allAreasQuery(params.oid)),
      context.queryClient.ensureQueryData(allTablesQuery(params.oid)),
    ]),
  component: ScheduleCreatePage,
})
