import { createFileRoute, redirect } from '@tanstack/react-router'

import { roleListQuery } from '@/features/role/api'
import { RoleListPage } from '@/features/role/components/RoleListPage'
import { listSearch } from '@/shared/lib/list-search'
import { can } from '@/shared/lib/permissions'

export const Route = createFileRoute('/_auth/admin/outlets/$oid/roles/')({
  validateSearch: (search): { page?: number } => ({ page: listSearch(search).page }),
  beforeLoad: ({ context }) => {
    if (!can(context.auth.user(), 'role.view')) throw redirect({ to: '/admin' })
  },
  loaderDeps: ({ search }) => search,
  loader: ({ context, params, deps }) => context.queryClient.ensureQueryData(roleListQuery(params.oid, deps.page)),
  component: RoleListPage,
})
