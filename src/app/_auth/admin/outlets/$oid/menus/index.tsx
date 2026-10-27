import { createFileRoute, redirect } from '@tanstack/react-router'

import { allCategoriesQuery, menuListQuery } from '@/hooks/menu/menu.queries'
import { menuListFromUrl } from '@/modules/menu/filters'
import { canViewMenus } from '@/modules/menu/permissions'

import { MenuListPage } from './_components/menu-list-page'

export const Route = createFileRoute('/_auth/admin/outlets/$oid/menus/')({
  validateSearch: menuListFromUrl,
  beforeLoad: ({ context }) => {
    if (!canViewMenus(context.auth.user())) throw redirect({ to: '/admin' })
  },
  loaderDeps: ({ search }) => search,
  loader: ({ context, params, deps }) =>
    Promise.all([
      context.queryClient.ensureQueryData(menuListQuery(params.oid, deps)),
      context.queryClient.ensureQueryData(allCategoriesQuery(params.oid)),
    ]),
  component: MenuListPage,
})
