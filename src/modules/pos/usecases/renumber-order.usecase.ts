import type { CreateOrderRequest, PosDevice } from '../types'
import { countFor, outletDay, receiptNumber } from './receipt-number.usecase'

/**
 * The order with the device's next receipt number of the order's own day:
 * the server checks the number's day against when the order was made.
 */
export function renumber(order: CreateOrderRequest, device: PosDevice, timeZone: string): CreateOrderRequest {
  const day = outletDay(new Date(order.client_created_at), timeZone)
  const count = countFor({ day: device.day, next: device.next_number }, day)
  return { ...order, order_no: receiptNumber(device.order_no_prefix, day, count) }
}
