import { useQueryClient } from '@tanstack/react-query'

import { ApiError } from '@/shared/api/client'
import { queryKeys } from '@/shared/api/query-keys'

import {
  posDeviceQuery,
  postOrder,
  stockChanged,
  type CreateOrderRequest,
  type Order,
  type OrderType,
  type PosDevice,
} from './api'
import { useCart } from './cart'
import { newOrderId } from './order-id'
import { countFor, outletDay, receiptNumber } from './receipt-number'

/** An order as the cashier charges it, before it has an ID and a receipt number. */
export type Draft = {
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

/**
 * The order for a draft, made at `at`: a new ID, and the device's next
 * receipt number of the outlet's day then.
 */
export function makeOrder(draft: Draft, device: PosDevice, at: Date, timeZone: string): CreateOrderRequest {
  const order: CreateOrderRequest = {
    order_id: newOrderId(),
    order_no: '',
    type: draft.type,
    client_created_at: at.toISOString(),
    items: draft.items,
    ...(draft.voucherCode ? { voucher_code: draft.voucherCode } : {}),
    ...(draft.tableId ? { table_id: draft.tableId } : {}),
    ...(draft.standNumber ? { stand_number: draft.standNumber } : {}),
    total: draft.total,
    payment: { method: 'cash', received: draft.received },
  }
  return renumber(order, device, timeZone)
}

/**
 * The order with the device's next receipt number of the order's own day:
 * the server checks the number's day against when the order was made.
 */
export function renumber(order: CreateOrderRequest, device: PosDevice, timeZone: string): CreateOrderRequest {
  const day = outletDay(new Date(order.client_created_at), timeZone)
  const count = countFor({ day: device.day, next: device.next_number }, day)
  return { ...order, order_no: receiptNumber(device.order_no_prefix, day, count) }
}

/**
 * After a sale: the count the device's next receipt number takes, from the
 * number just used, while GET /pos/device is asked again.
 */
export function afterSale(device: PosDevice, orderNo: string): PosDevice {
  const [day, count] = orderNo.split('-').slice(-2)
  const iso = `${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6)}`
  if (iso !== device.day) return device
  return { ...device, next_number: Math.max(device.next_number, Number(count) + 1) }
}

export type Outcome =
  /** Taken: the order as the server saved it. */
  | { kind: 'sold'; order: Order }
  /** Refused, so not taken: the cashier fixes what the error names and charges again. */
  | { kind: 'refused'; error: ApiError }
  /** No answer, or a server error: it may have been taken, so the same order goes again. */
  | { kind: 'unknown'; error: unknown }

/** The waits before each automatic resend of an order with no answer; tests shorten them. */
export const resendDelays = [1000, 3000]

/** How many times an order is renumbered when its receipt number turns out taken. */
const renumbers = 2

/** An answer that settles an order: anything below a 5xx. */
function settles(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status < 500
}

/**
 * Charging the cart without charging twice. An order is built once, with its
 * own ID, and sent: a resend of the same order is answered with it as it was
 * taken, never a second one. While no answer has come it stays pending in
 * the cart, which can't change until it is settled.
 *
 * - No answer, or a 5xx: sent again by itself twice, then by the cashier
 *   (resend), always exactly as it was.
 * - `order_no_taken` (the cashier open in two tabs): renumbered from
 *   GET /pos/device and sent again, with its ID kept. The refusal proves no
 *   order has it.
 * - A voucher's refusal (`voucher_used_up`, …): the voucher comes off the
 *   order, and the cashier charges again without it.
 * - `table_unavailable` (the table was turned off, scheduled off or
 *   deleted since it was picked): the table comes off the order, and the
 *   floor is loaded again.
 * - `dine_in_mode_changed` (the Manager changed how the outlet seats its
 *   customers): the table, or the stand's number, the way the refusal names
 *   has no place for comes off the order, and the catalog, which says the
 *   way, and the floor load again.
 * - Any other refusal: what it names is loaded again (the catalog, or the
 *   device), and the cashier charges a new order once it is put right.
 */
export function useCheckout(outletId: string, timeZone: string) {
  const queryClient = useQueryClient()

  async function send(order: CreateOrderRequest): Promise<Outcome> {
    for (let attempt = 0; ; attempt++) {
      try {
        return { kind: 'sold', order: await postOrder(outletId, order) }
      } catch (error) {
        if (settles(error)) return { kind: 'refused', error }
        if (attempt >= resendDelays.length) return { kind: 'unknown', error }
        await new Promise((resolve) => setTimeout(resolve, resendDelays[attempt]))
      }
    }
  }

  async function settle(first: CreateOrderRequest): Promise<Outcome> {
    const { setPending } = useCart.getState()
    let order = first
    for (let renumbered = 0; ; renumbered++) {
      setPending(order)
      const outcome = await send(order)
      if (outcome.kind === 'unknown') return outcome
      setPending(null)
      if (outcome.kind === 'sold') {
        sold(outcome.order)
        return outcome
      }
      if (outcome.error.code === 'order_no_taken' && renumbered < renumbers) {
        order = renumber(order, await freshDevice(), timeZone)
        continue
      }
      refused(outcome.error)
      return outcome
    }
  }

  function freshDevice() {
    return queryClient.fetchQuery({ ...posDeviceQuery(outletId), staleTime: 0 })
  }

  function sold(order: Order) {
    useCart.getState().clear()
    queryClient.setQueryData(queryKeys.pos.device(outletId), (device: PosDevice | undefined) =>
      device ? afterSale(device, order.order_no) : device,
    )
    void queryClient.invalidateQueries({ queryKey: queryKeys.pos.device(outletId) })
    stockChanged(queryClient, outletId)
  }

  function refused(error: ApiError) {
    // A voucher the sale can't take comes off the order; the screen says why.
    if (error.code.startsWith('voucher_')) {
      useCart.getState().setVoucher(null)
      return
    }
    // So does a table it can't be sold at.
    if (error.code === 'table_unavailable') {
      useCart.getState().setTable(null)
      void queryClient.invalidateQueries({ queryKey: queryKeys.tables.floor(outletId) })
      return
    }
    // And the table, or the stand's number, the outlet's way of seating its
    // customers now has no place for.
    if (error.code === 'dine_in_mode_changed') {
      if (error.details?.mode === 'number') useCart.getState().setTable(null)
      if (error.details?.mode === 'table') useCart.getState().setStandNumber('')
      void queryClient.invalidateQueries({ queryKey: queryKeys.pos.catalog(outletId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.tables.floor(outletId) })
      return
    }
    const key = error.code.startsWith('device_') ? queryKeys.pos.device(outletId) : queryKeys.pos.catalog(outletId)
    void queryClient.invalidateQueries({ queryKey: key })
  }

  return {
    /** Charges a new order for the draft. */
    async pay(draft: Draft): Promise<Outcome> {
      const device = queryClient.getQueryData<PosDevice>(queryKeys.pos.device(outletId)) ?? (await freshDevice())
      return settle(makeOrder(draft, device, new Date(), timeZone))
    },
    /** Sends the pending order again, exactly as it was. */
    async resend(): Promise<Outcome> {
      const { pending } = useCart.getState()
      if (!pending) throw new Error('no order is pending')
      return settle(pending)
    },
    /**
     * Lets go of the pending order without an answer, so the cart can change
     * again. It may have been taken: today's orders say.
     */
    abandon() {
      useCart.getState().setPending(null)
    },
  }
}
