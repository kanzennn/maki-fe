import type { CartItem, CreateOrderRequest, OrderDraft, PosDevice } from '../types'
import { newOrderId } from './new-order-id.usecase'
import { renumber } from './renumber-order.usecase'

/** The cart's lines as the order's items: at the catalog's prices, a blank wish none. */
export function orderItems(items: CartItem[]): CreateOrderRequest['items'] {
  return items.map(({ line, menu }) => ({
    menu_id: menu.menu_id,
    qty: line.qty,
    price: menu.price,
    note: line.note.trim() === '' ? null : line.note.trim(),
  }))
}

/**
 * The order for a draft, made at `at`: a new ID, and the device's next
 * receipt number of the outlet's day then.
 */
export function makeOrder(draft: OrderDraft, device: PosDevice, at: Date, timeZone: string): CreateOrderRequest {
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
