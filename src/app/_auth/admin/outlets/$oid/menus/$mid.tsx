import { createFileRoute, redirect } from '@tanstack/react-router'

import { PageNotFound } from '@/components/shared/page-state'
import { allCategoriesQuery, menuQuery, stockMovementsQuery } from '@/hooks/menu/menu.queries'
import { stockHistoryFromUrl } from '@/modules/menu/filters'
import { canViewMenus } from '@/modules/menu/permissions'
import { orNotFound } from '@/providers/not-found'

import { MenuDetailPage } from './_components/menu-detail-page'

// ?page= is the stock history's page.
export const Route = createFileRoute('/_auth/admin/outlets/$oid/menus/$mid')({
  validateSearch: stockHistoryFromUrl,
  beforeLoad: ({ context }) => {
    if (!canViewMenus(context.auth.user())) throw redirect({ to: '/admin' })
  },
  loaderDeps: ({ search }) => search,
  // The history answers 404 too for a menu that isn't there.
  loader: ({ context, params, deps }) =>
    orNotFound(
      Promise.all([
        context.queryClient.ensureQueryData(menuQuery(params.oid, params.mid)),
        context.queryClient.ensureQueryData(allCategoriesQuery(params.oid)),
        context.queryClient.ensureQueryData(stockMovementsQuery(params.oid, params.mid, deps)),
      ]),
    ),
  component: MenuDetailPage,
  // Here rather than at the root, so the admin area stays around it.
  notFoundComponent: PageNotFound,
})
