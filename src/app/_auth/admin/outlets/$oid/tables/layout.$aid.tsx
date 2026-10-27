import { createFileRoute, redirect } from '@tanstack/react-router'

import { PageNotFound } from '@/components/shared/page-state'
import { layoutQuery } from '@/hooks/table/table.queries'
import { canManageTables } from '@/modules/table/permissions'
import { orNotFound } from '@/providers/not-found'

import { LayoutEditorPage } from './_components/layout-editor-page'

export const Route = createFileRoute('/_auth/admin/outlets/$oid/tables/layout/$aid')({
  beforeLoad: ({ context }) => {
    if (!canManageTables(context.auth.user())) throw redirect({ to: '/admin' })
  },
  loader: ({ context, params }) => orNotFound(context.queryClient.ensureQueryData(layoutQuery(params.oid, params.aid))),
  component: LayoutEditorPage,
  // Here rather than at the root, so the admin area stays around it.
  notFoundComponent: PageNotFound,
})
