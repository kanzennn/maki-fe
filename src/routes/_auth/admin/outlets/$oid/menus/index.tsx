import { createFileRoute, redirect } from '@tanstack/react-router'

import { allCategoriesQuery, menuListQuery, type MenuSearch } from '@/features/menu/api'
import { MenuListPage } from '@/features/menu/components/MenuListPage'
import { listSearch } from '@/shared/lib/list-search'
import { can } from '@/shared/lib/permissions'

const stock = ['ok', 'low', 'out', 'untracked'] as const

export const Route = createFileRoute('/_auth/admin/outlets/$oid/menus/')({
  validateSearch: (search): MenuSearch => ({
    ...listSearch(search),
    category_id: typeof search.category_id === 'string' && search.category_id !== '' ? search.category_id : undefined,
    status: search.status === 'active' || search.status === 'inactive' ? search.status : undefined,
    stock: stock.find((s) => s === search.stock),
  }),
  beforeLoad: ({ context }) => {
    if (!can(context.auth.user(), 'menu.view')) throw redirect({ to: '/admin' })
  },
  loaderDeps: ({ search }) => search,
  loader: ({ context, params, deps }) =>
    Promise.all([
      context.queryClient.ensureQueryData(menuListQuery(params.oid, deps)),
      context.queryClient.ensureQueryData(allCategoriesQuery(params.oid)),
    ]),
  component: MenuListPage,
})
