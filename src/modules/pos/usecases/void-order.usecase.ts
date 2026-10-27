import * as orderRepository from '../repositories/order.repository'
import type { Order } from '../types'
import { validateVoidReason } from '../validations/void.validation'

/**
 * Voids a paid order, for the reason given: the order and its payment are
 * cancelled and the stock goes back.
 */
export function voidOrder(outletId: string, orderId: string, reason: string): Promise<Order> {
  return orderRepository.voidOrder(outletId, orderId, validateVoidReason(reason))
}
