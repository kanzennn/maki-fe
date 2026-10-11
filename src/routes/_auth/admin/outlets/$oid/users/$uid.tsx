import { createFileRoute, redirect } from '@tanstack/react-router'

import { staffQuery } from '@/features/user/api'
import { UserDetailPage } from '@/features/user/components/UserDetailPage'
import { allRolesQuery } from '@/shared/api/roles'
import { PageNotFound } from '@/shared/components/PageState'
import { orNotFound } from '@/shared/lib/not-found'
import { can } from '@/shared/lib/permissions'

export const Route = createFileRoute('/_auth/admin/outlets/$oid/users/$uid')({
  beforeLoad: ({ context }) => {
    if (!can(context.auth.user(), 'user.view')) throw redirect({ to: '/admin' })
  },
  loader: ({ context, params }) =>
    Promise.all([
      orNotFound(context.queryClient.ensureQueryData(staffQuery(params.oid, params.uid))),
      context.queryClient.ensureQueryData(allRolesQuery(params.oid)),
    ]),
  component: UserDetailPage,
  // Here rather than at the root, so the admin area stays around it.
  notFoundComponent: PageNotFound,
})
