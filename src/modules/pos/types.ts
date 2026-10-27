import type { ApiError } from '@/lib/http'
import type { components } from '@/lib/api-schema'

export type PosCatalog = components['schemas']['PosCatalog']
export type PosMenu = components['schemas']['PosMenu']
export type PosCategory = components['schemas']['PosCategory']
export type PosOutlet = components['schemas']['PosOutlet']
export type PosDevice = components['schemas']['PosDevice']
export type Order = components['schemas']['Order']
export type OrderSummary = components['schemas']['OrderSummary']
export type OrderType = components['schemas']['OrderType']
export type PaymentMethod = components['schemas']['PaymentMethod']
export type CreateOrderRequest = components['schemas']['CreateOrderRequest']
/** A voucher as the cashier checked it: its code and the terms its discount is worked out from. */
export type PosVoucher = components['schemas']['VoucherTerms']
export type VoucherQuote = components['schemas']['VoucherQuote']

/** Today's orders as their page shows them: search text, page. */
export type OrderListState = { q?: string; page?: number }

/**
 * A line of the cart: a menu, how many, and the customer's wish for it. The
 * name is the menu's when it was picked, to say which one went if the
 * catalog drops it; the price is always the catalog's.
 */
export type CartLine = { menuId: string; name: string; qty: number; note: string }

/** A line of the cart with its menu as the catalog has it now. */
export type CartItem = { line: CartLine; menu: PosMenu }

/** The order's table, by its name when it was picked: the receipt has the name as the server saved it. */
export type CartTable = { tableId: string; name: string }

/** The server's limits on an order. */
export const MAX_QTY = 999
export const MAX_LINES = 100
export const MAX_NOTE = 100

/** What the cart lost when it met the catalog as it is now. */
export type Reconciled = {
  lines: CartLine[]
  /** Lines whose menu is no longer on sale, or is out of stock. */
  removed: CartLine[]
  /** Lines cut to the stock there is: the line, and its qty now. */
  reduced: { line: CartLine; qty: number }[]
}

/** A line as the totals read it: a price in whole rupiah, and how many. */
export type TotalsLine = { price: number; qty: number }

/** An order's figures, in whole rupiah. */
export type Totals = {
  subtotal: number
  discount: number
  service: number
  tax: number
  total: number
}

/**
 * The most an order's lines may come to: the server's limit too. Under it,
 * every product of the totals stays an exact integer in JavaScript, whose
 * numbers are exact only up to 2^53.
 */
export const MAX_SUBTOTAL = 1_000_000_000

/** What a voucher's discount depends on, as POST …/vouchers/validate gives it. */
export type VoucherTerms = {
  type: 'percent' | 'amount'
  /** Basis points for a percentage (1000 is 10%), whole rupiah for an amount. */
  value: number
  /** A percentage's most, in rupiah; null for none. */
  max_discount: number | null
  /** The subtotal the voucher needs; null for none. */
  min_spend: number | null
}

/** The most characters a stand's number has. */
export const MAX_STAND = 10

/** The most cash one payment takes in: the server's limit. */
export const MAX_RECEIVED = 100_000_000_000

/** The most characters a void's reason has: the server's limit. */
export const MAX_VOID_REASON = 200

/** Where the device's count of receipt numbers is: of which day, and the number it takes next. */
export type Count = { day: string; next: number }

/** An order as the cashier charges it, before it has an ID and a receipt number. */
export type OrderDraft = {
  type: OrderType
  items: CreateOrderRequest['items']
  /** The voucher's code, or null for none. */
  voucherCode: string | null
  /** The dine-in order's table, or null for none. */
  tableId: string | null
  /** The number on the dine-in customer's stand, as the server keeps it, or null for none. */
  standNumber: string | null
  total: number
  received: number
}

export type Outcome =
  /** Taken: the order as the server saved it. */
  | { kind: 'sold'; order: Order }
  /** Refused, so not taken: the cashier fixes what the error names and charges again. */
  | { kind: 'refused'; error: ApiError }
  /** No answer, or a server error: it may have been taken, so the same order goes again. */
  | { kind: 'unknown'; error: unknown }

/**
 * What a refused order changes: what comes off the cart, and what loads
 * again — the floor, the catalog (which also says how the outlet seats its
 * dine-in customers), or the device.
 */
export type RefusalEffects = {
  dropVoucher: boolean
  dropTable: boolean
  dropStand: boolean
  reload: ('floor' | 'catalog' | 'device')[]
}

/** Why the server refused an order's table: turned off, out of service on a schedule, or gone. */
export type TableUnavailable = 'inactive' | 'scheduled' | 'missing'
