import { createFileRoute, redirect } from '@tanstack/react-router'

import { UserCreatePage } from '@/features/user/components/UserCreatePage'
import { allRolesQuery } from '@/shared/api/roles'
import { can } from '@/shared/lib/permissions'

export const Route = createFileRoute('/_auth/admin/outlets/$oid/users/new')({
  beforeLoad: ({ context }) => {
    if (!can(context.auth.user(), 'user.manage')) throw redirect({ to: '/admin' })
  },
  loader: ({ context, params }) => context.queryClient.ensureQueryData(allRolesQuery(params.oid)),
  component: UserCreatePage,
})
