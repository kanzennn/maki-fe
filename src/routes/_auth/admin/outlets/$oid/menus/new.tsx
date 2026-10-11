import { createFileRoute, redirect } from '@tanstack/react-router'

import { allCategoriesQuery } from '@/features/menu/api'
import { MenuCreatePage } from '@/features/menu/components/MenuCreatePage'
import { can } from '@/shared/lib/permissions'

export const Route = createFileRoute('/_auth/admin/outlets/$oid/menus/new')({
  beforeLoad: ({ context }) => {
    if (!can(context.auth.user(), 'menu.manage')) throw redirect({ to: '/admin' })
  },
  loader: ({ context, params }) => context.queryClient.ensureQueryData(allCategoriesQuery(params.oid)),
  component: MenuCreatePage,
})
