import { createFileRoute, redirect } from '@tanstack/react-router'

import { allAreasQuery, dineInModeQuery, layoutQuery } from '@/hooks/table/table.queries'
import { tablesFromUrl } from '@/modules/table/filters'
import { canViewTables } from '@/modules/table/permissions'

import { TablesPage } from './_components/tables-page'

export const Route = createFileRoute('/_auth/admin/outlets/$oid/tables/')({
  validateSearch: tablesFromUrl,
  beforeLoad: ({ context }) => {
    if (!canViewTables(context.auth.user())) throw redirect({ to: '/admin' })
  },
  loaderDeps: ({ search }) => search,
  loader: async ({ context, params, deps }) => {
    const [areas] = await Promise.all([
      context.queryClient.ensureQueryData(allAreasQuery(params.oid)),
      context.queryClient.ensureQueryData(dineInModeQuery(params.oid)),
    ])
    const area = areas.find((a) => a.area_id === deps.area) ?? areas[0]
    if (area) await context.queryClient.ensureQueryData(layoutQuery(params.oid, area.area_id))
  },
  component: TablesPage,
})
