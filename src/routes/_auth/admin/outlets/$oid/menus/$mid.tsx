import { createFileRoute, redirect } from '@tanstack/react-router'

import { allCategoriesQuery, menuQuery, stockMovementsQuery } from '@/features/menu/api'
import { MenuDetailPage } from '@/features/menu/components/MenuDetailPage'
import { PageNotFound } from '@/shared/components/PageState'
import { listSearch } from '@/shared/lib/list-search'
import { orNotFound } from '@/shared/lib/not-found'
import { can } from '@/shared/lib/permissions'

// ?page= is the stock history's page.
export const Route = createFileRoute('/_auth/admin/outlets/$oid/menus/$mid')({
  validateSearch: (search): { page?: number } => ({ page: listSearch(search).page }),
  beforeLoad: ({ context }) => {
    if (!can(context.auth.user(), 'menu.view')) throw redirect({ to: '/admin' })
  },
  loaderDeps: ({ search }) => search,
  // The history answers 404 too for a menu that isn't there.
  loader: ({ context, params, deps }) =>
    orNotFound(
      Promise.all([
        context.queryClient.ensureQueryData(menuQuery(params.oid, params.mid)),
        context.queryClient.ensureQueryData(allCategoriesQuery(params.oid)),
        context.queryClient.ensureQueryData(stockMovementsQuery(params.oid, params.mid, deps.page)),
      ]),
    ),
  component: MenuDetailPage,
  // Here rather than at the root, so the admin area stays around it.
  notFoundComponent: PageNotFound,
})
