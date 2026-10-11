/**
 * Query keys for the data more than one feature shows or changes: a user's
 * new role changes the roles' user counts, a new Manager their outlet's
 * list of Managers, a renamed role every user row that shows it, and the
 * cashier's sales and voids change the stock the menu pages show. Each
 * feature's api.ts builds its keys here, so invalidation reaches all of
 * them.
 */
export const queryKeys = {
  outlets: {
    all: ['outlets'] as const,
    lists: () => [...queryKeys.outlets.all, 'list'] as const,
    detail: (outletId: string) => [...queryKeys.outlets.all, 'detail', outletId] as const,
  },
  roles: {
    /** Everything about an outlet's roles. */
    all: (outletId: string) => ['roles', outletId] as const,
    lists: (outletId: string) => [...queryKeys.roles.all(outletId), 'list'] as const,
    detail: (outletId: string, roleId: string) => [...queryKeys.roles.all(outletId), 'detail', roleId] as const,
  },
  staff: {
    /** Everything about an outlet's users. */
    all: (outletId: string) => ['staff', outletId] as const,
    lists: (outletId: string) => [...queryKeys.staff.all(outletId), 'list'] as const,
    detail: (outletId: string, userId: string) => [...queryKeys.staff.all(outletId), 'detail', userId] as const,
  },
  categories: {
    /** Everything about an outlet's menu categories. */
    all: (outletId: string) => ['categories', outletId] as const,
    lists: (outletId: string) => [...queryKeys.categories.all(outletId), 'list'] as const,
  },
  menus: {
    /** Everything about an outlet's menus and their stock. */
    all: (outletId: string) => ['menus', outletId] as const,
    lists: (outletId: string) => [...queryKeys.menus.all(outletId), 'list'] as const,
    detail: (outletId: string, menuId: string) => [...queryKeys.menus.all(outletId), 'detail', menuId] as const,
    movements: (outletId: string, menuId: string) => [...queryKeys.menus.all(outletId), 'movements', menuId] as const,
  },
  pos: {
    /** What the outlet's cashier sells from: its catalog, stock included. */
    catalog: (outletId: string) => ['pos', outletId, 'catalog'] as const,
    /** The device this browser is, as one of the outlet's cashiers. */
    device: (outletId: string) => ['pos', outletId, 'device'] as const,
  },
  orders: {
    /** Everything about an outlet's orders. */
    all: (outletId: string) => ['orders', outletId] as const,
    lists: (outletId: string) => [...queryKeys.orders.all(outletId), 'list'] as const,
    detail: (outletId: string, orderId: string) => [...queryKeys.orders.all(outletId), 'detail', orderId] as const,
  },
  devices: {
    /** An outlet's cashier devices, as its Manager and the Owner list them. */
    all: (outletId: string) => ['devices', outletId] as const,
  },
  tables: {
    /**
     * Everything about an outlet's areas, tables, layouts and schedules, the
     * cashier's floor included: a sale, a release or a schedule changes a
     * table's status wherever it shows.
     */
    all: (outletId: string) => ['tables', outletId] as const,
    areas: (outletId: string) => [...queryKeys.tables.all(outletId), 'areas'] as const,
    lists: (outletId: string) => [...queryKeys.tables.all(outletId), 'list'] as const,
    layout: (outletId: string, areaId: string) => [...queryKeys.tables.all(outletId), 'layout', areaId] as const,
    schedules: (outletId: string) => [...queryKeys.tables.all(outletId), 'schedules'] as const,
    schedule: (outletId: string, scheduleId: string) =>
      [...queryKeys.tables.schedules(outletId), 'detail', scheduleId] as const,
    /** The cashier's floor. */
    floor: (outletId: string) => [...queryKeys.tables.all(outletId), 'floor'] as const,
    /** How the outlet seats its dine-in customers: at tables, or by number stands. */
    mode: (outletId: string) => [...queryKeys.tables.all(outletId), 'mode'] as const,
  },
  vouchers: {
    /** The Owner's vouchers, and what each outlet's Manager sees of them. */
    all: ['vouchers'] as const,
    lists: () => [...queryKeys.vouchers.all, 'list'] as const,
    detail: (voucherId: string) => [...queryKeys.vouchers.all, 'detail', voucherId] as const,
    /** The sales that used a voucher: a void changes them. */
    redemptions: (voucherId: string) => [...queryKeys.vouchers.all, 'redemptions', voucherId] as const,
    /** Every outlet's list, as its Manager sees it. */
    outlets: () => [...queryKeys.vouchers.all, 'outlet'] as const,
    outlet: (outletId: string) => [...queryKeys.vouchers.outlets(), outletId] as const,
  },
}
