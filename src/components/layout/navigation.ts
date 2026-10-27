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

import type { Me } from '@/modules/auth/types'
import { canViewDashboard } from '@/modules/dashboard/permissions'
import { canManageDevices } from '@/modules/device/permissions'
import { canViewMenus } from '@/modules/menu/permissions'
import { canManageOutlets } from '@/modules/outlet/permissions'
import { canSell, canVoid } from '@/modules/pos/permissions'
import { canViewRoles } from '@/modules/role/permissions'
import { canViewTables } from '@/modules/table/permissions'
import { canViewStaff } from '@/modules/user/permissions'
import { canManageVouchers, canViewOutletVouchers } from '@/modules/voucher/permissions'

/**
 * The admin area's navigation for user, in order: only the pages their
 * permissions open. The Owner reaches each outlet's menu, tables, roles and
 * users through Outlet; everyone else works in their own outlet.
 */
export function navItems(user: Me | null) {
  if (!user) return []
  const oid = user.outlet_id
  const items = []
  if (canViewDashboard(user)) {
    items.push(item('dashboard', LayoutDashboardIcon, linkOptions({ to: '/admin' }), true))
  }
  if (canManageOutlets(user)) items.push(item('outlets', StoreIcon, linkOptions({ to: '/admin/outlets' })))
  if (canManageVouchers(user)) items.push(item('vouchers', TicketPercentIcon, linkOptions({ to: '/admin/vouchers' })))
  if (oid && canViewMenus(user)) {
    items.push(item('menus', UtensilsCrossedIcon, linkOptions({ to: '/admin/outlets/$oid/menus', params: { oid } })))
  }
  if (oid && canViewTables(user)) {
    items.push(item('tables', ArmchairIcon, linkOptions({ to: '/admin/outlets/$oid/tables', params: { oid } })))
  }
  if (oid && canViewRoles(user)) {
    items.push(item('roles', ShieldCheckIcon, linkOptions({ to: '/admin/outlets/$oid/roles', params: { oid } })))
  }
  if (oid && canViewStaff(user)) {
    items.push(item('users', UsersIcon, linkOptions({ to: '/admin/outlets/$oid/users', params: { oid } })))
  }
  // Fixed roles, not permissions: in their outlet, its Manager manages its
  // cashier devices, and sees the vouchers its cashier can take. The Owner,
  // in no outlet of their own, reaches both through Outlet.
  if (oid && canManageDevices(user)) {
    items.push(
      item('devices', MonitorSmartphoneIcon, linkOptions({ to: '/admin/outlets/$oid/devices', params: { oid } })),
    )
  }
  if (oid && canViewOutletVouchers(user)) {
    items.push(
      item('vouchers', TicketPercentIcon, linkOptions({ to: '/admin/outlets/$oid/vouchers', params: { oid } })),
    )
  }
  if (canSell(user)) {
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
  if (canSell(user)) items.push(item('pos', ShoppingBagIcon, linkOptions({ to: '/pos' }), true))
  if (canSell(user) && hasTables) items.push(item('tables', ArmchairIcon, linkOptions({ to: '/pos/tables' })))
  if (canSell(user) || canVoid(user)) {
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
