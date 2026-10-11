import { linkOptions } from '@tanstack/react-router'
import {
  ArmchairIcon,
  LayoutDashboardIcon,
  MonitorSmartphoneIcon,
  ReceiptTextIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
  StoreIcon,
  TicketPercentIcon,
  UsersIcon,
  UtensilsCrossedIcon,
  type LucideIcon,
} from 'lucide-react'

import { can } from '@/shared/lib/permissions'
import type { Me } from '@/shared/lib/session'

/**
 * The admin area's navigation for user, in order: only the pages their
 * permissions open. The Owner reaches each outlet's menu, tables, roles and
 * users through Outlet; everyone else works in their own outlet.
 */
export function navItems(user: Me | null) {
  if (!user) return []
  const oid = user.outlet_id
  const items = []
  if (can(user, 'dashboard.view')) {
    items.push(item('dashboard', LayoutDashboardIcon, linkOptions({ to: '/admin' }), true))
  }
  if (user.is_owner) {
    items.push(item('outlets', StoreIcon, linkOptions({ to: '/admin/outlets' })))
    items.push(item('vouchers', TicketPercentIcon, linkOptions({ to: '/admin/vouchers' })))
  }
  if (oid && can(user, 'menu.view')) {
    items.push(item('menus', UtensilsCrossedIcon, linkOptions({ to: '/admin/outlets/$oid/menus', params: { oid } })))
  }
  if (oid && can(user, 'table.view')) {
    items.push(item('tables', ArmchairIcon, linkOptions({ to: '/admin/outlets/$oid/tables', params: { oid } })))
  }
  if (oid && can(user, 'role.view')) {
    items.push(item('roles', ShieldCheckIcon, linkOptions({ to: '/admin/outlets/$oid/roles', params: { oid } })))
  }
  if (oid && can(user, 'user.view')) {
    items.push(item('users', UsersIcon, linkOptions({ to: '/admin/outlets/$oid/users', params: { oid } })))
  }
  // The fixed role, not a permission: the outlet's Manager manages its
  // cashier devices. The Owner reaches them through Outlet.
  if (oid && user.is_manager) {
    items.push(
      item('devices', MonitorSmartphoneIcon, linkOptions({ to: '/admin/outlets/$oid/devices', params: { oid } })),
    )
    // The Owner makes vouchers; the Manager sees the ones their cashier can take.
    items.push(
      item('vouchers', TicketPercentIcon, linkOptions({ to: '/admin/outlets/$oid/vouchers', params: { oid } })),
    )
  }
  if (can(user, 'checkout.create')) {
    items.push(item('pos', ShoppingBagIcon, linkOptions({ to: '/pos' })))
  }
  return items
}

/**
 * The cashier's navigation: selling, the tables when the outlet has some,
 * today's orders, and the way back to the admin area for whoever has a page
 * there.
 */
export function posNavItems(user: Me | null, hasTables = false) {
  if (!user) return []
  const items = []
  if (can(user, 'checkout.create')) {
    items.push(item('pos', ShoppingBagIcon, linkOptions({ to: '/pos' }), true))
  }
  if (can(user, 'checkout.create') && hasTables) {
    items.push(item('tables', ArmchairIcon, linkOptions({ to: '/pos/tables' })))
  }
  if (can(user, 'checkout.create') || can(user, 'order.void')) {
    items.push(item('history', ReceiptTextIcon, linkOptions({ to: '/pos/history' })))
  }
  if (navItems(user).some((i) => i.key !== 'pos')) {
    items.push(item('admin', LayoutDashboardIcon, linkOptions({ to: '/admin' })))
  }
  return items
}

export type NavItem = ReturnType<typeof navItems>[number] | ReturnType<typeof posNavItems>[number]

type NavKey =
  | 'dashboard'
  | 'outlets'
  | 'vouchers'
  | 'menus'
  | 'tables'
  | 'roles'
  | 'users'
  | 'devices'
  | 'pos'
  | 'history'
  | 'admin'

function item<L>(key: NavKey, icon: LucideIcon, link: L, exact = false) {
  return { key, icon, link, exact }
}
