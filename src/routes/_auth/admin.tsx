import { createFileRoute } from '@tanstack/react-router'

import { AdminLayout } from '@/app/AdminLayout'

// The admin area: Owner, Managers, and staff whose role opens a page here.
// Each page below checks its own permission.
export const Route = createFileRoute('/_auth/admin')({
  component: AdminLayout,
})
