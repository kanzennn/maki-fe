import { createFileRoute, redirect } from '@tanstack/react-router'

import { roleListQuery } from '@/hooks/role/role.queries'
import { roleListFromUrl } from '@/modules/role/filters'
import { canViewRoles } from '@/modules/role/permissions'

import { RoleListPage } from './_components/role-list-page'

export const Route = createFileRoute('/_auth/admin/outlets/$oid/roles/')({
  validateSearch: roleListFromUrl,
  beforeLoad: ({ context }) => {
    if (!canViewRoles(context.auth.user())) throw redirect({ to: '/admin' })
  },
  loaderDeps: ({ search }) => search,
  loader: ({ context, params, deps }) => context.queryClient.ensureQueryData(roleListQuery(params.oid, deps)),
  component: RoleListPage,
})
