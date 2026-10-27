import { createFileRoute, redirect } from '@tanstack/react-router'

import { allCategoriesQuery } from '@/hooks/menu/menu.queries'
import { canViewMenus } from '@/modules/menu/permissions'

import { CategoryListPage } from './_components/category-list-page'

// Under /menus, so the Menu item and tab stay active here.
export const Route = createFileRoute('/_auth/admin/outlets/$oid/menus/categories')({
  beforeLoad: ({ context }) => {
    if (!canViewMenus(context.auth.user())) throw redirect({ to: '/admin' })
  },
  loader: ({ context, params }) => context.queryClient.ensureQueryData(allCategoriesQuery(params.oid)),
  component: CategoryListPage,
})
