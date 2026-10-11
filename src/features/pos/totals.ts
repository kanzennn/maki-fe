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
 * every product below stays an exact integer in JavaScript, whose numbers
 * are exact only up to 2^53.
 */
export const MAX_SUBTOTAL = 1_000_000_000

/**
 * The server's rule, which the Android cashier follows too, and which
 * maki-be/api/test-vectors/order-totals.json pins down: the subtotal is the
 * lines' price × qty; the discount comes off it; the service charge is on
 * what is left, and the tax on that plus the service, each rounded to the
 * nearest rupiah, half up. Rates are basis points: 1000 is 10%.
 */
export function computeTotals(lines: TotalsLine[], discount: number, serviceBps: number, taxBps: number): Totals {
  const subtotal = lines.reduce((sum, line) => sum + line.price * line.qty, 0)
  const base = subtotal - discount
  const service = share(base, serviceBps)
  const tax = share(base + service, taxBps)
  return { subtotal, discount, service, tax, total: base + service + tax }
}

/**
 * bps / 10000 of amount, rounded half up, in integers alone: no division
 * whose result a float could round the wrong way. A voucher's percentage
 * is rounded the same way.
 */
export function share(amount: number, bps: number): number {
  const scaled = amount * bps + 5000
  return (scaled - (scaled % 10000)) / 10000
}
