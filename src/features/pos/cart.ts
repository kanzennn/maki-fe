import { create } from 'zustand'

import type { CreateOrderRequest, OrderType, PosMenu, PosVoucher } from './api'

/**
 * A line of the cart: a menu, how many, and the customer's wish for it. The
 * name is the menu's when it was picked, to say which one went if the
 * catalog drops it; the price is always the catalog's.
 */
export type CartLine = { menuId: string; name: string; qty: number; note: string }

/** The order's table, by its name when it was picked: the receipt has the name as the server saved it. */
export type CartTable = { tableId: string; name: string }

/** The server's limits on an order. */
export const MAX_QTY = 999
export const MAX_LINES = 100
export const MAX_NOTE = 100

/** The most of a menu one order can take: its stock when tracked. */
export function maxQty(menu: Pick<PosMenu, 'track_stock' | 'stock_qty'>): number {
  return menu.track_stock ? Math.min(Math.max(menu.stock_qty ?? 0, 0), MAX_QTY) : MAX_QTY
}

/** One more of the menu: a new line, or one more on its line, up to what there is. */
export function addOne(lines: CartLine[], menu: PosMenu): CartLine[] {
  const line = lines.find((l) => l.menuId === menu.menu_id)
  if (line) return setQty(lines, menu, line.qty + 1)
  if (maxQty(menu) < 1 || lines.length >= MAX_LINES) return lines
  return [...lines, { menuId: menu.menu_id, name: menu.name, qty: 1, note: '' }]
}

/** The menu's line at qty, kept between 1 and what there is; 0 takes it out. */
export function setQty(lines: CartLine[], menu: PosMenu, qty: number): CartLine[] {
  if (qty <= 0) return removeLine(lines, menu.menu_id)
  const capped = Math.min(Math.floor(qty), maxQty(menu))
  if (capped < 1) return removeLine(lines, menu.menu_id)
  return lines.map((l) => (l.menuId === menu.menu_id ? { ...l, qty: capped } : l))
}

export function setNote(lines: CartLine[], menuId: string, note: string): CartLine[] {
  return lines.map((l) => (l.menuId === menuId ? { ...l, note: note.slice(0, MAX_NOTE) } : l))
}

export function removeLine(lines: CartLine[], menuId: string): CartLine[] {
  return lines.filter((l) => l.menuId !== menuId)
}

/** What the cart lost when it met the catalog as it is now. */
export type Reconciled = {
  lines: CartLine[]
  /** Lines whose menu is no longer on sale, or is out of stock. */
  removed: CartLine[]
  /** Lines cut to the stock there is: the line, and its qty now. */
  reduced: { line: CartLine; qty: number }[]
}

/**
 * The cart against the catalog: a line whose menu is gone from it, or has
 * none left, comes out, and one for more than there is is cut to what there
 * is. Prices aren't in the cart; they are always the catalog's.
 */
export function reconcile(lines: CartLine[], menus: Map<string, PosMenu>): Reconciled {
  const out: Reconciled = { lines: [], removed: [], reduced: [] }
  for (const line of lines) {
    const menu = menus.get(line.menuId)
    const most = menu ? maxQty(menu) : 0
    if (most < 1) {
      out.removed.push(line)
    } else if (line.qty > most) {
      out.reduced.push({ line, qty: most })
      out.lines.push({ ...line, qty: most })
    } else {
      out.lines.push(line)
    }
  }
  return out
}

type CartState = {
  /** Who the cart is for: a cart never passes from one signed-in user to the next. */
  owner: string | null
  type: OrderType
  lines: CartLine[]
  /**
   * The voucher the customer gave, one per order, as the server checked it:
   * its discount is worked out again from its terms as the cart changes.
   */
  voucher: PosVoucher | null
  /** The table a dine-in order is for, if the cashier picked one: always optional. */
  table: CartTable | null
  /**
   * The number on the stand a dine-in customer took, as the cashier types
   * it, where the outlet seats its customers by number stands; empty for
   * none.
   */
  standNumber: string
  /**
   * The order sent whose answer never came: it may have been taken, so it is
   * sent again exactly as it was, and the cart stays as it is until then.
   */
  pending: CreateOrderRequest | null
  /** Empties the cart for owner, if it was someone else's. */
  claim: (owner: string) => void
  setType: (type: OrderType) => void
  setLines: (update: (lines: CartLine[]) => CartLine[]) => void
  setVoucher: (voucher: PosVoucher | null) => void
  setTable: (table: CartTable | null) => void
  setStandNumber: (standNumber: string) => void
  setPending: (order: CreateOrderRequest | null) => void
  /** Ready for the next customer. */
  clear: () => void
}

const empty: Pick<CartState, 'type' | 'lines' | 'voucher' | 'table' | 'standNumber' | 'pending'> = {
  type: 'dine_in',
  lines: [],
  voucher: null,
  table: null,
  standNumber: '',
  pending: null,
}

/**
 * The cart, outside any one component: it stays while the cashier looks at
 * today's orders and comes back. Nothing of it is stored in the browser.
 */
export const useCart = create<CartState>()((set) => ({
  owner: null,
  ...empty,
  claim: (owner) => set((s) => (s.owner === owner ? s : { owner, ...empty })),
  // A takeaway has no table, nor a stand: it lets go of them.
  setType: (type) =>
    set((s) => (s.pending ? s : type === 'takeaway' ? { type, table: null, standNumber: '' } : { type })),
  setLines: (update) => set((s) => (s.pending ? s : { lines: update(s.lines) })),
  setVoucher: (voucher) => set((s) => (s.pending ? s : { voucher })),
  setTable: (table) => set((s) => (s.pending ? s : { table })),
  setStandNumber: (standNumber) => set((s) => (s.pending ? s : { standNumber })),
  setPending: (pending) => set({ pending }),
  clear: () => set(empty),
}))
