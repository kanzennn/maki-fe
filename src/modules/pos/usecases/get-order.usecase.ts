import * as orderRepository from '../repositories/order.repository'
import type { Order } from '../types'

export function getOrder(outletId: string, orderId: string): Promise<Order> {
  return orderRepository.getOrder(outletId, orderId)
}
