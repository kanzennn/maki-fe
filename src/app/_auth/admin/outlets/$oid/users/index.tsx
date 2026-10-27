import { createFileRoute, redirect } from '@tanstack/react-router'

import { allRolesQuery } from '@/hooks/role/role.queries'
import { staffListQuery } from '@/hooks/user/staff.queries'
import { staffListFromUrl } from '@/modules/user/filters'
import { canViewStaff } from '@/modules/user/permissions'

import { UserListPage } from './_components/user-list-page'

export const Route = createFileRoute('/_auth/admin/outlets/$oid/users/')({
  validateSearch: staffListFromUrl,
  beforeLoad: ({ context }) => {
    if (!canViewStaff(context.auth.user())) throw redirect({ to: '/admin' })
  },
  loaderDeps: ({ search }) => search,
  loader: ({ context, params, deps }) =>
    Promise.all([
      context.queryClient.ensureQueryData(staffListQuery(params.oid, deps)),
      context.queryClient.ensureQueryData(allRolesQuery(params.oid)),
    ]),
  component: UserListPage,
})
