import type { Page } from '@/lib/http'

import { orderListParams } from '../filters'
import * as orderRepository from '../repositories/order.repository'
import type { OrderListState, OrderSummary } from '../types'

/** The page of the outlet's orders of today the list shows. */
export function listTodayOrders(outletId: string, state: OrderListState): Promise<Page<OrderSummary>> {
  return orderRepository.listOrders(outletId, orderListParams(state))
}
