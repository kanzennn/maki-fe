import { createFileRoute, redirect } from '@tanstack/react-router'

import { PageNotFound } from '@/components/shared/page-state'
import { allRolesQuery } from '@/hooks/role/role.queries'
import { staffQuery } from '@/hooks/user/staff.queries'
import { canViewStaff } from '@/modules/user/permissions'
import { orNotFound } from '@/providers/not-found'

import { UserDetailPage } from './_components/user-detail-page'

export const Route = createFileRoute('/_auth/admin/outlets/$oid/users/$uid')({
  beforeLoad: ({ context }) => {
    if (!canViewStaff(context.auth.user())) throw redirect({ to: '/admin' })
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
