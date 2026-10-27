import { createFileRoute, redirect } from '@tanstack/react-router'

import { scheduleListQuery } from '@/hooks/table/table.queries'
import { scheduleListFromUrl } from '@/modules/table/filters'
import { canViewTables } from '@/modules/table/permissions'

import { ScheduleListPage } from './_components/schedule-list-page'

export const Route = createFileRoute('/_auth/admin/outlets/$oid/tables/schedules/')({
  validateSearch: scheduleListFromUrl,
  beforeLoad: ({ context }) => {
    if (!canViewTables(context.auth.user())) throw redirect({ to: '/admin' })
  },
  loaderDeps: ({ search }) => search,
  loader: ({ context, params, deps }) => context.queryClient.ensureQueryData(scheduleListQuery(params.oid, deps)),
  component: ScheduleListPage,
})
