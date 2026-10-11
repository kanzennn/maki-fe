import { createFileRoute, redirect } from '@tanstack/react-router'

import { allAreasQuery, dineInModeQuery, layoutQuery, type TablesSearch } from '@/features/table/api'
import { TablesPage } from '@/features/table/components/TablesPage'
import { can } from '@/shared/lib/permissions'

// ?area= is the area shown; without one, or with one that's gone, the first.
export const Route = createFileRoute('/_auth/admin/outlets/$oid/tables/')({
  validateSearch: (search): TablesSearch => ({
    area: typeof search.area === 'string' && search.area !== '' ? search.area : undefined,
  }),
  beforeLoad: ({ context }) => {
    if (!can(context.auth.user(), 'table.view')) throw redirect({ to: '/admin' })
  },
  loaderDeps: ({ search }) => search,
  loader: async ({ context, params, deps }) => {
    const [areas] = await Promise.all([
      context.queryClient.ensureQueryData(allAreasQuery(params.oid)),
      context.queryClient.ensureQueryData(dineInModeQuery(params.oid)),
    ])
    const area = areas.data.find((a) => a.area_id === deps.area) ?? areas.data[0]
    if (area) await context.queryClient.ensureQueryData(layoutQuery(params.oid, area.area_id))
  },
  component: TablesPage,
})
