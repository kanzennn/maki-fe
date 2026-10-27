import { createFileRoute, redirect } from '@tanstack/react-router'

import { allCategoriesQuery } from '@/hooks/menu/menu.queries'
import { canManageMenus } from '@/modules/menu/permissions'

import { MenuCreatePage } from './_components/menu-create-page'

export const Route = createFileRoute('/_auth/admin/outlets/$oid/menus/new')({
  beforeLoad: ({ context }) => {
    if (!canManageMenus(context.auth.user())) throw redirect({ to: '/admin' })
  },
  loader: ({ context, params }) => context.queryClient.ensureQueryData(allCategoriesQuery(params.oid)),
  component: MenuCreatePage,
})
