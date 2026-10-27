import { createFileRoute, redirect } from '@tanstack/react-router'

import { permissionCatalogQuery } from '@/hooks/role/role.queries'
import { canManageRoles } from '@/modules/role/permissions'

import { RoleCreatePage } from './_components/role-create-page'

export const Route = createFileRoute('/_auth/admin/outlets/$oid/roles/new')({
  beforeLoad: ({ context }) => {
    if (!canManageRoles(context.auth.user())) throw redirect({ to: '/admin' })
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(permissionCatalogQuery()),
  component: RoleCreatePage,
})
