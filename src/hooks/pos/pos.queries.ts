import { keepPreviousData, queryOptions, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/hooks/query-keys'
import type { OrderListState } from '@/modules/pos/types'
import { getCatalog } from '@/modules/pos/usecases/get-catalog.usecase'
import { getOrder } from '@/modules/pos/usecases/get-order.usecase'
import { getPosDevice } from '@/modules/pos/usecases/get-pos-device.usecase'
import { listTodayOrders } from '@/modules/pos/usecases/list-today-orders.usecase'
import { voidOrder } from '@/modules/pos/usecases/void-order.usecase'

/**
 * What the cashier sells from. The stock in it is as it was when loaded, so
 * it is loaded again after each sale and every half minute; the server
 * checks each sale against the stock as it is.
 */
export const catalogQuery = (outletId: string) =>
  queryOptions({
    queryKey: queryKeys.pos.catalog(outletId),
    queryFn: () => getCatalog(outletId),
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
    queryFn: () => getPosDevice(outletId),
    retry: false,
  })

export const todayOrdersQuery = (outletId: string, state: OrderListState) =>
  queryOptions({
    queryKey: [...queryKeys.orders.lists(outletId), state] as const,
    queryFn: () => listTodayOrders(outletId, state),
    // A new search keeps showing the last list until its own arrives.
    placeholderData: keepPreviousData,
  })

export const orderQuery = (outletId: string, orderId: string) =>
  queryOptions({
    queryKey: queryKeys.orders.detail(outletId, orderId),
    queryFn: () => getOrder(outletId, orderId),
  })

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

export function useVoidOrder(outletId: string, orderId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (reason: string) => voidOrder(outletId, orderId, reason),
    onSuccess: (order) => {
      queryClient.setQueryData(queryKeys.orders.detail(outletId, orderId), order)
      stockChanged(queryClient, outletId)
    },
  })
}
