import { createFileRoute, redirect } from '@tanstack/react-router'

import { permissionCatalogQuery, roleQuery } from '@/features/role/api'
import { RoleDetailPage } from '@/features/role/components/RoleDetailPage'
import { PageNotFound } from '@/shared/components/PageState'
import { orNotFound } from '@/shared/lib/not-found'
import { can } from '@/shared/lib/permissions'

export const Route = createFileRoute('/_auth/admin/outlets/$oid/roles/$rid')({
  beforeLoad: ({ context }) => {
    if (!can(context.auth.user(), 'role.view')) throw redirect({ to: '/admin' })
  },
  loader: ({ context, params }) =>
    Promise.all([
      orNotFound(context.queryClient.ensureQueryData(roleQuery(params.oid, params.rid))),
      context.queryClient.ensureQueryData(permissionCatalogQuery()),
    ]),
  component: RoleDetailPage,
  // Here rather than at the root, so the admin area stays around it.
  notFoundComponent: PageNotFound,
})
