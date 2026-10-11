import { createFileRoute, redirect } from '@tanstack/react-router'

import { allAreasQuery } from '@/features/table/api'
import { AreasPage } from '@/features/table/components/AreasPage'
import { can } from '@/shared/lib/permissions'

// Under /tables, so the Tables item and tab stay active here.
export const Route = createFileRoute('/_auth/admin/outlets/$oid/tables/areas')({
  beforeLoad: ({ context }) => {
    if (!can(context.auth.user(), 'table.view')) throw redirect({ to: '/admin' })
  },
  loader: ({ context, params }) => context.queryClient.ensureQueryData(allAreasQuery(params.oid)),
  component: AreasPage,
})
