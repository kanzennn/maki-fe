import { createFileRoute, redirect } from '@tanstack/react-router'

import { staffListQuery, type StaffSearch } from '@/features/user/api'
import { UserListPage } from '@/features/user/components/UserListPage'
import { allRolesQuery } from '@/shared/api/roles'
import { listSearch } from '@/shared/lib/list-search'
import { can } from '@/shared/lib/permissions'

export const Route = createFileRoute('/_auth/admin/outlets/$oid/users/')({
  validateSearch: (search): StaffSearch => ({
    ...listSearch(search),
    status: search.status === 'active' || search.status === 'inactive' ? search.status : undefined,
    role_id: typeof search.role_id === 'string' && search.role_id !== '' ? search.role_id : undefined,
  }),
  beforeLoad: ({ context }) => {
    if (!can(context.auth.user(), 'user.view')) throw redirect({ to: '/admin' })
  },
  loaderDeps: ({ search }) => search,
  loader: ({ context, params, deps }) =>
    Promise.all([
      context.queryClient.ensureQueryData(staffListQuery(params.oid, deps)),
      context.queryClient.ensureQueryData(allRolesQuery(params.oid)),
    ]),
  component: UserListPage,
})
