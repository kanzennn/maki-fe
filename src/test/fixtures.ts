import type { components } from '@/shared/api/schema'
import type { Me } from '@/shared/lib/session'

type Outlet = components['schemas']['Outlet']
type Role = components['schemas']['Role']
type Staff = components['schemas']['Staff']

/** The outlet the staff below work in, as GET /me summarises it. */
export const testOutletSummary = {
  outlet_id: 'o1',
  code: 'BDG01',
  name: 'Maki Bandung',
  timezone: 'Asia/Jakarta',
  locale: 'id',
} satisfies Me['outlet']

/** The Owner's permissions, fixed in the backend (user/permissions.go). */
const ownerPermissions = ['dashboard.view', 'log.view', 'menu.view', 'role.view', 'table.view', 'user.manage', 'user.view']
/** Every permission there is: what a Manager holds in their outlet. */
export const allPermissions = [
  'checkout.create',
  'dashboard.view',
  'log.view',
  'menu.manage',
  'menu.view',
  'order.void',
  'payment.manage',
  'role.manage',
  'role.view',
  'stock.adjust',
  'table.manage',
  'table.view',
  'user.manage',
  'user.view',
]

/** A signed-in cashier, as GET /me returns them: their role gives checkout.create only. */
export const testUser: Me = {
  user_id: 'u1',
  username: 'kasir1',
  name: 'Budi',
  email: null,
  email_verified: false,
  pending_email: null,
  locale: null,
  language: 'id',
  is_owner: false,
  is_manager: false,
  outlet_id: 'o1',
  must_change_password: false,
  permissions: ['checkout.create'],
  outlet: testOutletSummary,
}

export const testOwner: Me = {
  ...testUser,
  user_id: 'owner',
  username: 'pemilik',
  name: 'Faiz',
  email: 'pemilik@maki.test',
  email_verified: true,
  is_owner: true,
  outlet_id: null,
  outlet: null,
  permissions: ownerPermissions,
}

export const testManager: Me = {
  ...testUser,
  user_id: 'm1',
  username: 'rina',
  name: 'Rina',
  is_manager: true,
  permissions: allPermissions,
}

/** Staff whose role lets them see and manage users, but not roles or menus. */
export const testSupervisor: Me = {
  ...testUser,
  user_id: 's1',
  username: 'sari',
  name: 'Sari',
  permissions: ['checkout.create', 'user.manage', 'user.view'],
}

export const testOutlet: Outlet = {
  ...testOutletSummary,
  locale: 'id',
  address: 'Jl. Braga 1',
  phone: null,
  open_time: '08:00',
  close_time: '22:00',
  tax_pct: 11,
  service_pct: 5.5,
  status: 'active',
  managers: [{ user_id: 'm1', name: 'Rina' }],
  created_at: '2026-09-01T02:00:00Z',
  updated_at: '2026-09-01T02:00:00Z',
}

export const testRoles: Role[] = [
  {
    role_id: 'r-kasir',
    name: 'Kasir',
    description: null,
    permissions: ['checkout.create'],
    user_count: 1,
    created_at: '2026-09-01T02:00:00Z',
    updated_at: '2026-09-01T02:00:00Z',
  },
  {
    role_id: 'r-dapur',
    name: 'Dapur',
    description: 'Stok dan menu',
    permissions: ['menu.manage', 'menu.view', 'stock.adjust'],
    user_count: 0,
    created_at: '2026-09-01T02:00:00Z',
    updated_at: '2026-09-01T02:00:00Z',
  },
]

export const testStaff: Staff = {
  user_id: 'u1',
  name: 'Budi',
  username: 'kasir1',
  email: null,
  phone: null,
  is_manager: false,
  role: { role_id: 'r-kasir', name: 'Kasir' },
  status: 'active',
  must_change_password: false,
  last_login_at: '2026-09-30T01:15:00Z',
  created_at: '2026-09-01T02:00:00Z',
  updated_at: '2026-09-01T02:00:00Z',
}

export const testManagerStaff: Staff = {
  ...testStaff,
  user_id: 'm1',
  name: 'Rina',
  username: 'rina',
  is_manager: true,
  role: null,
}

/** GET /permissions, as the backend's catalog groups it. */
export const testCatalog = {
  groups: [
    { module: 'dashboard', permissions: ['dashboard.view'] },
    { module: 'role', permissions: ['role.view', 'role.manage'] },
    { module: 'user', permissions: ['user.view', 'user.manage'] },
    { module: 'menu', permissions: ['menu.view', 'menu.manage', 'stock.adjust'] },
    { module: 'table', permissions: ['table.view', 'table.manage'] },
    { module: 'checkout', permissions: ['checkout.create', 'order.void'] },
    { module: 'payment', permissions: ['payment.manage'] },
    { module: 'log', permissions: ['log.view'] },
  ],
}

/** A list response: every item on one page. */
export function listOf<T>(data: T[]) {
  return { data, meta: { page: 1, page_size: 20, total: data.length } }
}

type Category = components['schemas']['Category']
type Menu = components['schemas']['Menu']

/** The outlet's categories, in the cashier's order. */
export const testCategories: Category[] = [
  {
    category_id: 'c-drinks',
    name: 'Minuman',
    icon: '🧋',
    sort_order: 0,
    is_active: true,
    menu_count: 1,
    created_at: '2026-09-01T02:00:00Z',
    updated_at: '2026-09-01T02:00:00Z',
  },
  {
    category_id: 'c-cakes',
    name: 'Kue',
    icon: '🍰',
    sort_order: 1,
    is_active: true,
    menu_count: 2,
    created_at: '2026-09-01T02:00:00Z',
    updated_at: '2026-09-01T02:00:00Z',
  },
]

const drinks = { category_id: 'c-drinks', name: 'Minuman', icon: '🧋', is_active: true }
const cakes = { category_id: 'c-cakes', name: 'Kue', icon: '🍰', is_active: true }

/** A menu without stock, one that runs low, and one that ran out and was hidden. */
export const testMenus: Menu[] = [
  {
    menu_id: 'm-coffee',
    name: 'Es Kopi Susu',
    description: 'Kopi susu gula aren',
    sku: 'KOPI-01',
    price: 18000,
    image_url: null,
    track_stock: false,
    stock_qty: 0,
    stock_alert: null,
    stock_status: 'untracked',
    is_active: true,
    category: drinks,
    created_at: '2026-09-01T02:00:00Z',
    updated_at: '2026-09-01T02:00:00Z',
  },
  {
    menu_id: 'm-bolu',
    name: 'Bolu Pandan',
    description: null,
    sku: null,
    price: 25000,
    image_url: null,
    track_stock: true,
    stock_qty: 2,
    stock_alert: 3,
    stock_status: 'low',
    is_active: true,
    category: cakes,
    created_at: '2026-09-01T02:00:00Z',
    updated_at: '2026-09-01T02:00:00Z',
  },
  {
    menu_id: 'm-brownies',
    name: 'Brownies',
    description: null,
    sku: 'BRW',
    price: 20000,
    image_url: null,
    track_stock: true,
    stock_qty: 0,
    stock_alert: null,
    stock_status: 'out',
    is_active: false,
    category: cakes,
    created_at: '2026-09-01T02:00:00Z',
    updated_at: '2026-09-01T02:00:00Z',
  },
]

type Voucher = components['schemas']['Voucher']

/**
 * One of the Owner's vouchers, for Bandung alone: 12,5% off, at most
 * Rp 20.000, from Rp 50.000 spent, 17–31 August in WIB.
 */
export const testVoucher: Voucher = {
  voucher_id: 'v1',
  code: 'MERDEKA17',
  name: 'Diskon Merdeka',
  type: 'percent',
  value: 1250,
  max_discount: 20000,
  min_spend: 50000,
  quota: 100,
  used_count: 37,
  start_at: '2026-08-16T17:00:00Z',
  expired_at: '2026-08-31T16:59:00Z',
  all_outlets: false,
  outlets: [{ outlet_id: 'o1', code: 'BDG01', name: 'Maki Bandung' }],
  is_active: true,
  status: 'active',
  first_used_at: null,
  created_at: '2026-08-01T03:00:00Z',
  updated_at: '2026-08-01T03:00:00Z',
}
