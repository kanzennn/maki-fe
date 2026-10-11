import { keepPreviousData, queryOptions, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'

import { api, unwrap } from '@/shared/api/client'
import { queryKeys } from '@/shared/api/query-keys'
import type { components } from '@/shared/api/schema'

export type PosCatalog = components['schemas']['PosCatalog']
export type PosMenu = components['schemas']['PosMenu']
export type PosCategory = components['schemas']['PosCategory']
export type PosOutlet = components['schemas']['PosOutlet']
export type PosDevice = components['schemas']['PosDevice']
export type Order = components['schemas']['Order']
export type OrderSummary = components['schemas']['OrderSummary']
export type OrderType = components['schemas']['OrderType']
export type PaymentMethod = components['schemas']['PaymentMethod']
export type CreateOrderRequest = components['schemas']['CreateOrderRequest']
/** A voucher as the cashier checked it: its code and the terms its discount is worked out from. */
export type PosVoucher = components['schemas']['VoucherTerms']
export type VoucherQuote = components['schemas']['VoucherQuote']
export type PosFloor = components['schemas']['Floor']

/** Today's orders, from the address bar. */
export type OrderSearch = { q?: string; page?: number }

/**
 * What the cashier sells from. The stock in it is as it was when loaded, so
 * it is loaded again after each sale and every half minute; the server
 * checks each sale against the stock as it is.
 */
export const catalogQuery = (outletId: string) =>
  queryOptions({
    queryKey: queryKeys.pos.catalog(outletId),
    queryFn: () => unwrap(api.GET('/api/v1/outlets/{oid}/pos/catalog', { params: { path: { oid: outletId } } })),
    refetchInterval: 30_000,
  })

/**
 * The outlet's tables as the cashier picks from them: its areas that hold
 * tables, their layouts, and each table's status. A status changes with
 * every sale, so the floor is loaded again each time it's shown, after a
 * sale, a void or a release, and every half minute.
 */
export const floorQuery = (outletId: string) =>
  queryOptions({
    queryKey: queryKeys.tables.floor(outletId),
    queryFn: () => unwrap(api.GET('/api/v1/outlets/{oid}/pos/tables', { params: { path: { oid: outletId } } })),
    staleTime: 0,
    refetchInterval: 30_000,
  })

/**
 * This browser as one of the outlet's cashier devices, with its count of
 * receipt numbers today. 403 device_not_registered or device_revoked: it
 * can't sell, and no retry changes that.
 */
export const posDeviceQuery = (outletId: string) =>
  queryOptions({
    queryKey: queryKeys.pos.device(outletId),
    queryFn: () => unwrap(api.GET('/api/v1/outlets/{oid}/pos/device', { params: { path: { oid: outletId } } })),
    retry: false,
  })

export const todayOrdersQuery = (outletId: string, search: OrderSearch) =>
  queryOptions({
    queryKey: [...queryKeys.orders.lists(outletId), search] as const,
    queryFn: () => unwrap(api.GET('/api/v1/outlets/{oid}/orders', { params: { path: { oid: outletId }, query: search } })),
    // A new search keeps showing the last list until its own arrives.
    placeholderData: keepPreviousData,
  })

export const orderQuery = (outletId: string, orderId: string) =>
  queryOptions({
    queryKey: queryKeys.orders.detail(outletId, orderId),
    queryFn: () =>
      unwrap(api.GET('/api/v1/outlets/{oid}/orders/{orid}', { params: { path: { oid: outletId, orid: orderId } } })),
  })

/**
 * Checks the code a customer gave, from this browser as one of the outlet's
 * tills: the voucher's terms and its discount on the subtotal, or why the
 * sale can't take it. Takes nothing; the sale does.
 */
export function validateVoucher(outletId: string, code: string, subtotal: number): Promise<VoucherQuote> {
  return unwrap(
    api.POST('/api/v1/outlets/{oid}/vouchers/validate', {
      params: { path: { oid: outletId } },
      body: { code, subtotal },
    }),
  )
}

/** Sends an order; the same order sent again is answered with it as it was taken. */
export function postOrder(outletId: string, body: CreateOrderRequest): Promise<Order> {
  return unwrap(api.POST('/api/v1/outlets/{oid}/orders', { params: { path: { oid: outletId } }, body }))
}

/**
 * After a sale or a void: the cashier's catalog and today's orders, the
 * menu pages, which show the stock too, and the tables, whose customers the
 * sale seated or the void sent off.
 */
export function stockChanged(queryClient: QueryClient, outletId: string) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.pos.catalog(outletId) })
  void queryClient.invalidateQueries({ queryKey: queryKeys.tables.all(outletId) })
  void queryClient.invalidateQueries({ queryKey: queryKeys.orders.all(outletId) })
  void queryClient.invalidateQueries({ queryKey: queryKeys.menus.all(outletId) })
}

/**
 * Makes this browser one of the outlet's cashiers, as its Manager, under a
 * name. The token comes back as a cookie that page scripts can't read.
 */
export function useActivateDevice(outletId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) =>
      unwrap(
        api.POST('/api/v1/outlets/{oid}/devices', {
          params: { path: { oid: outletId } },
          body: { name, platform: 'web' },
        }),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.pos.device(outletId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.devices.all(outletId) })
    },
  })
}

/** Customers have left the table: it's free again, wherever it shows. */
export function useReleaseTable(outletId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (tableId: string) =>
      unwrap(
        api.POST('/api/v1/outlets/{oid}/tables/{tid}/release', {
          params: { path: { oid: outletId, tid: tableId } },
        }),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.tables.all(outletId) }),
  })
}

export function useVoidOrder(outletId: string, orderId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (reason: string) =>
      unwrap(
        api.POST('/api/v1/outlets/{oid}/orders/{orid}/void', {
          params: { path: { oid: outletId, orid: orderId } },
          body: { reason },
        }),
      ),
    onSuccess: (order) => {
      queryClient.setQueryData(queryKeys.orders.detail(outletId, orderId), order)
      stockChanged(queryClient, outletId)
    },
  })
}
