import { createFileRoute, redirect } from '@tanstack/react-router'

import { permissionCatalogQuery } from '@/features/role/api'
import { RoleCreatePage } from '@/features/role/components/RoleCreatePage'
import { can } from '@/shared/lib/permissions'

export const Route = createFileRoute('/_auth/admin/outlets/$oid/roles/new')({
  beforeLoad: ({ context }) => {
    if (!can(context.auth.user(), 'role.manage')) throw redirect({ to: '/admin' })
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(permissionCatalogQuery()),
  component: RoleCreatePage,
})
