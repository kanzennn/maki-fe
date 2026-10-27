import { useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/hooks/query-keys'
import type { ApiError } from '@/lib/http'
import type { CreateOrderRequest, Order, OrderDraft, Outcome, PosDevice } from '@/modules/pos/types'
import { chargeOrder } from '@/modules/pos/usecases/charge-order.usecase'
import { afterSale } from '@/modules/pos/usecases/count-after-sale.usecase'
import { makeOrder } from '@/modules/pos/usecases/make-order.usecase'
import { refusalEffects } from '@/modules/pos/usecases/read-refusal.usecase'

import { posDeviceQuery, stockChanged } from './pos.queries'
import { useCart } from './use-cart'

/**
 * Charging the cart without charging twice (chargeOrder): while no answer
 * has come the order stays pending in the cart, which can't change until it
 * is settled. No answer, or a 5xx, after its resends: the cashier sends it
 * again (resend), exactly as it was. A sale empties the cart; a refusal
 * takes off it what the refusal names, and loads again what it names
 * (refusalEffects), and the cashier charges a new order once it is put
 * right.
 */
export function useCheckout(outletId: string, timeZone: string) {
  const queryClient = useQueryClient()

  function freshDevice() {
    return queryClient.fetchQuery({ ...posDeviceQuery(outletId), staleTime: 0 })
  }

  async function settle(order: CreateOrderRequest): Promise<Outcome> {
    const outcome = await chargeOrder(outletId, order, timeZone, {
      pending: useCart.getState().setPending,
      freshDevice,
    })
    if (outcome.kind === 'sold') sold(outcome.order)
    if (outcome.kind === 'refused') refused(outcome.error)
    return outcome
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
    const effects = refusalEffects(error)
    const cart = useCart.getState()
    if (effects.dropVoucher) cart.setVoucher(null)
    if (effects.dropTable) cart.setTable(null)
    if (effects.dropStand) cart.setStandNumber('')
    const keys = {
      floor: queryKeys.tables.floor(outletId),
      catalog: queryKeys.pos.catalog(outletId),
      device: queryKeys.pos.device(outletId),
    }
    for (const what of effects.reload) void queryClient.invalidateQueries({ queryKey: keys[what] })
  }

  return {
    /** Charges a new order for the draft. */
    async pay(draft: OrderDraft): Promise<Outcome> {
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
