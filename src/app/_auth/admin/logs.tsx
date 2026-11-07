import { createFileRoute, redirect } from '@tanstack/react-router'

import { ownerLogsQuery } from '@/hooks/log/log.queries'
import { allOutletsQuery } from '@/hooks/outlet/outlet.queries'
import { browserTimeZone } from '@/lib/time'
import { logListFromUrl } from '@/modules/log/filters'
import { canViewLogs } from '@/modules/log/permissions'

import { OwnerLogPage } from './_components/owner-log-page'

// Every outlet's Log Action, for the Owner.
export const Route = createFileRoute('/_auth/admin/logs')({
  validateSearch: logListFromUrl,
  beforeLoad: ({ context }) => {
    const user = context.auth.user()
    if (!user?.is_owner || !canViewLogs(user)) throw redirect({ to: '/admin' })
  },
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    Promise.all([
      context.queryClient.ensureQueryData(ownerLogsQuery(deps, browserTimeZone())),
      context.queryClient.ensureQueryData(allOutletsQuery()),
    ]),
  component: OwnerLogPage,
})
