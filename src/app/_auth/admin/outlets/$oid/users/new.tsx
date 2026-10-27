import { createFileRoute, redirect } from '@tanstack/react-router'

import { allRolesQuery } from '@/hooks/role/role.queries'
import { canManageStaff } from '@/modules/user/permissions'

import { UserCreatePage } from './_components/user-create-page'

export const Route = createFileRoute('/_auth/admin/outlets/$oid/users/new')({
  beforeLoad: ({ context }) => {
    if (!canManageStaff(context.auth.user())) throw redirect({ to: '/admin' })
  },
  loader: ({ context, params }) => context.queryClient.ensureQueryData(allRolesQuery(params.oid)),
  component: UserCreatePage,
})
