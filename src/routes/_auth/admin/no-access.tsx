import { createFileRoute } from '@tanstack/react-router'

import { NoAccessPage } from '@/app/NoAccessPage'

export const Route = createFileRoute('/_auth/admin/no-access')({
  component: NoAccessPage,
})
