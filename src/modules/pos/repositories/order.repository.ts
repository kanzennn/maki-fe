import { apiPath, http, type Page, type QueryParams } from '@/lib/http'

import type { CreateOrderRequest, Order, OrderSummary } from '../types'

/** A page of the outlet's orders of today, newest first. */
export function listOrders(outletId: string, params: QueryParams<'/outlets/{oid}/orders'>): Promise<Page<OrderSummary>> {
  return http.getPaginated<OrderSummary>(apiPath('/outlets/{oid}/orders', { oid: outletId }), params)
}

export function getOrder(outletId: string, orderId: string): Promise<Order> {
  return http.get<Order>(apiPath('/outlets/{oid}/orders/{orid}', { oid: outletId, orid: orderId }))
}

/** Sends an order; the same order sent again is answered with it as it was taken. */
export function createOrder(outletId: string, body: CreateOrderRequest): Promise<Order> {
  return http.post<Order>(apiPath('/outlets/{oid}/orders', { oid: outletId }), body)
}

export function voidOrder(outletId: string, orderId: string, reason: string): Promise<Order> {
  return http.post<Order>(apiPath('/outlets/{oid}/orders/{orid}/void', { oid: outletId, orid: orderId }), { reason })
}
