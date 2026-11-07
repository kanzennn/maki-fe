import { createFileRoute, redirect } from '@tanstack/react-router'

import { outletLogsQuery } from '@/hooks/log/log.queries'
import { logListFromUrl } from '@/modules/log/filters'
import { canViewLogs } from '@/modules/log/permissions'

import { OutletLogPage } from './_components/outlet-log-page'

// One outlet's Log Action, for whoever holds log.view.
export const Route = createFileRoute('/_auth/admin/outlets/$oid/logs')({
  validateSearch: logListFromUrl,
  beforeLoad: ({ context }) => {
    if (!canViewLogs(context.auth.user())) throw redirect({ to: '/admin' })
  },
  loaderDeps: ({ search }) => search,
  loader: ({ context, params, deps }) =>
    context.queryClient.ensureQueryData(outletLogsQuery(params.oid, deps, context.outlet.timezone)),
  component: OutletLogPage,
})
