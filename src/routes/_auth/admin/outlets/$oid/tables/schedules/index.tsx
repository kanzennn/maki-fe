import { createFileRoute, redirect } from '@tanstack/react-router'

import { scheduleListQuery, scheduleStatuses, type ScheduleSearch } from '@/features/table/api'
import { ScheduleListPage } from '@/features/table/components/ScheduleListPage'
import { listSearch } from '@/shared/lib/list-search'
import { can } from '@/shared/lib/permissions'

export const Route = createFileRoute('/_auth/admin/outlets/$oid/tables/schedules/')({
  validateSearch: (search): ScheduleSearch => ({
    status: scheduleStatuses.find((s) => s === search.status),
    page: listSearch(search).page,
  }),
  beforeLoad: ({ context }) => {
    if (!can(context.auth.user(), 'table.view')) throw redirect({ to: '/admin' })
  },
  loaderDeps: ({ search }) => search,
  loader: ({ context, params, deps }) => context.queryClient.ensureQueryData(scheduleListQuery(params.oid, deps)),
  component: ScheduleListPage,
})
