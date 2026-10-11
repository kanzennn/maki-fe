import { createFileRoute, redirect } from '@tanstack/react-router'

import { layoutQuery } from '@/features/table/api'
import { LayoutEditorPage } from '@/features/table/components/LayoutEditorPage'
import { PageNotFound } from '@/shared/components/PageState'
import { orNotFound } from '@/shared/lib/not-found'
import { can } from '@/shared/lib/permissions'

export const Route = createFileRoute('/_auth/admin/outlets/$oid/tables/layout/$aid')({
  beforeLoad: ({ context }) => {
    if (!can(context.auth.user(), 'table.manage')) throw redirect({ to: '/admin' })
  },
  loader: ({ context, params }) => orNotFound(context.queryClient.ensureQueryData(layoutQuery(params.oid, params.aid))),
  component: LayoutEditorPage,
  // Here rather than at the root, so the admin area stays around it.
  notFoundComponent: PageNotFound,
})
