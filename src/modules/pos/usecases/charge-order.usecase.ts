import type { CreateOrderRequest, Outcome, PosDevice } from '../types'
import { renumber } from './renumber-order.usecase'
import { sendOrder } from './send-order.usecase'

/** How many times an order is renumbered when its receipt number turns out taken. */
const renumbers = 2

/** What charging an order needs from the screen. */
export type Charging = {
  /** The order on its way, or null once an answer settled it: until then the cart can't change. */
  pending: (order: CreateOrderRequest | null) => void
  /** The device's count as the server has it now. */
  freshDevice: () => Promise<PosDevice>
}

/**
 * Charges an order without charging twice: it is sent (sendOrder) and stays
 * pending while no answer settles it. `order_no_taken` — the cashier open in
 * two tabs — renumbers it from the device's count and sends it again, its
 * ID kept: the refusal proves no order has it. Any other refusal, or a sale,
 * settles it.
 */
export async function chargeOrder(
  outletId: string,
  first: CreateOrderRequest,
  timeZone: string,
  { pending, freshDevice }: Charging,
): Promise<Outcome> {
  let order = first
  for (let renumbered = 0; ; renumbered++) {
    pending(order)
    const outcome = await sendOrder(outletId, order)
    if (outcome.kind === 'unknown') return outcome
    pending(null)
    if (outcome.kind === 'refused' && outcome.error.code === 'order_no_taken' && renumbered < renumbers) {
      order = renumber(order, await freshDevice(), timeZone)
      continue
    }
    return outcome
  }
}
