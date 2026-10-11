import { createFileRoute, redirect } from '@tanstack/react-router'

import { allCategoriesQuery } from '@/features/menu/api'
import { CategoryListPage } from '@/features/menu/components/CategoryListPage'
import { can } from '@/shared/lib/permissions'

// Under /menus, so the Menu item and tab stay active here.
export const Route = createFileRoute('/_auth/admin/outlets/$oid/menus/categories')({
  beforeLoad: ({ context }) => {
    if (!can(context.auth.user(), 'menu.view')) throw redirect({ to: '/admin' })
  },
  loader: ({ context, params }) => context.queryClient.ensureQueryData(allCategoriesQuery(params.oid)),
  component: CategoryListPage,
})
