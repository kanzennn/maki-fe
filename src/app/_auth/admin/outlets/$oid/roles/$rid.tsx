import { createFileRoute, redirect } from '@tanstack/react-router'

import { PageNotFound } from '@/components/shared/page-state'
import { permissionCatalogQuery, roleQuery } from '@/hooks/role/role.queries'
import { canViewRoles } from '@/modules/role/permissions'
import { orNotFound } from '@/providers/not-found'

import { RoleDetailPage } from './_components/role-detail-page'

export const Route = createFileRoute('/_auth/admin/outlets/$oid/roles/$rid')({
  beforeLoad: ({ context }) => {
    if (!canViewRoles(context.auth.user())) throw redirect({ to: '/admin' })
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
