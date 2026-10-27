import { create } from 'zustand'

import type { CartLine, CartTable, CreateOrderRequest, OrderType, PosVoucher } from '@/modules/pos/types'
import { chooseType } from '@/modules/pos/usecases/choose-order-type.usecase'

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
 * today's orders and comes back. Nothing of it is stored in the browser. Its
 * lines change through modules/pos's usecases (addOne, setQty, …), and
 * nothing changes while an order is pending.
 */
export const useCart = create<CartState>()((set) => ({
  owner: null,
  ...empty,
  claim: (owner) => set((s) => (s.owner === owner ? s : { owner, ...empty })),
  setType: (type) => set((s) => (s.pending ? s : chooseType(type))),
  setLines: (update) => set((s) => (s.pending ? s : { lines: update(s.lines) })),
  setVoucher: (voucher) => set((s) => (s.pending ? s : { voucher })),
  setTable: (table) => set((s) => (s.pending ? s : { table })),
  setStandNumber: (standNumber) => set((s) => (s.pending ? s : { standNumber })),
  setPending: (pending) => set({ pending }),
  clear: () => set(empty),
}))
