import { createFileRoute, redirect } from '@tanstack/react-router'

import { allAreasQuery } from '@/hooks/table/table.queries'
import { canViewTables } from '@/modules/table/permissions'

import { AreasPage } from './_components/areas-page'

// Under /tables, so the Tables item and tab stay active here.
export const Route = createFileRoute('/_auth/admin/outlets/$oid/tables/areas')({
  beforeLoad: ({ context }) => {
    if (!canViewTables(context.auth.user())) throw redirect({ to: '/admin' })
  },
  loader: ({ context, params }) => context.queryClient.ensureQueryData(allAreasQuery(params.oid)),
  component: AreasPage,
})
