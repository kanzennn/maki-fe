import { createFileRoute } from '@tanstack/react-router'

import { NoAccessPage } from './_components/no-access-page'

export const Route = createFileRoute('/_auth/admin/no-access')({
  component: NoAccessPage,
})
