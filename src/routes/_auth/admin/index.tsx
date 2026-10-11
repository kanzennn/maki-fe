import { createFileRoute, redirect } from '@tanstack/react-router'

import { navItems } from '@/app/navigation'
import { DashboardPage } from '@/features/dashboard/components/DashboardPage'
import { can } from '@/shared/lib/permissions'

// The admin area's front door, where sign-in and / lead: the dashboard for
// those who may see it, otherwise the first page the user's permissions
// open — the cashier for a cashier — or, with none, a page that says so.
export const Route = createFileRoute('/_auth/admin/')({
  beforeLoad: ({ context }) => {
    const user = context.auth.user()
    if (can(user, 'dashboard.view')) return
    const first = navItems(user)[0]
    throw redirect(first ? first.link : { to: '/admin/no-access' })
  },
  component: DashboardPage,
})
