import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import { api, unwrap } from '@/shared/api/client'
import { queryKeys } from '@/shared/api/query-keys'
import type { components } from '@/shared/api/schema'

export type Voucher = components['schemas']['Voucher']
export type VoucherInput = components['schemas']['VoucherInput']
export type VoucherStatus = components['schemas']['VoucherStatus']
export type VoucherType = components['schemas']['VoucherType']
export type VoucherRedemption = components['schemas']['VoucherRedemption']

export const voucherStatuses = ['active', 'scheduled', 'used_up', 'expired', 'inactive'] as const satisfies readonly VoucherStatus[]

/** A voucher list's search, from the address bar. */
export type VoucherSearch = { q?: string; status?: VoucherStatus; page?: number }

/** The Owner's vouchers. */
export const voucherListQuery = (search: VoucherSearch) =>
  queryOptions({
    queryKey: [...queryKeys.vouchers.lists(), search] as const,
    queryFn: () => unwrap(api.GET('/api/v1/vouchers', { params: { query: search } })),
  })

/** The vouchers an outlet's cashier can take, as its Manager sees them. */
export const outletVoucherListQuery = (outletId: string, search: VoucherSearch) =>
  queryOptions({
    queryKey: [...queryKeys.vouchers.outlet(outletId), search] as const,
    queryFn: () =>
      unwrap(api.GET('/api/v1/outlets/{oid}/vouchers', { params: { path: { oid: outletId }, query: search } })),
  })

export const voucherQuery = (voucherId: string) =>
  queryOptions({
    queryKey: queryKeys.vouchers.detail(voucherId),
    queryFn: () => unwrap(api.GET('/api/v1/vouchers/{vid}', { params: { path: { vid: voucherId } } })),
  })

/**
 * The outlets a voucher can be for, by name: the Owner's, on one page of
 * the most there is. A change to an outlet reloads it with the outlet lists.
 */
export const outletChoicesQuery = () =>
  queryOptions({
    queryKey: [...queryKeys.outlets.lists(), 'choices'] as const,
    queryFn: () => unwrap(api.GET('/api/v1/outlets', { params: { query: { page_size: 100 } } })),
  })

/** A page of the sales that used the voucher, newest first. */
export const redemptionsQuery = (voucherId: string, page?: number) =>
  queryOptions({
    queryKey: [...queryKeys.vouchers.redemptions(voucherId), { page }] as const,
    queryFn: () =>
      unwrap(
        api.GET('/api/v1/vouchers/{vid}/redemptions', { params: { path: { vid: voucherId }, query: { page } } }),
      ),
  })

/** Keeps the voucher's page up to date after a change, and every list that may show it. */
function useSaved() {
  const queryClient = useQueryClient()
  return (voucher: Voucher) => {
    queryClient.setQueryData(queryKeys.vouchers.detail(voucher.voucher_id), voucher)
    void queryClient.invalidateQueries({ queryKey: queryKeys.vouchers.lists() })
    void queryClient.invalidateQueries({ queryKey: queryKeys.vouchers.outlets() })
  }
}

export function useCreateVoucher() {
  const saved = useSaved()
  return useMutation({
    mutationFn: (body: VoucherInput) => unwrap(api.POST('/api/v1/vouchers', { body })),
    onSuccess: saved,
  })
}

export function useUpdateVoucher(voucherId: string) {
  const saved = useSaved()
  return useMutation({
    mutationFn: (body: VoucherInput) =>
      unwrap(api.PUT('/api/v1/vouchers/{vid}', { params: { path: { vid: voucherId } }, body })),
    onSuccess: saved,
  })
}

export function useSetVoucherActive(voucherId: string) {
  const saved = useSaved()
  return useMutation({
    mutationFn: (isActive: boolean) =>
      unwrap(
        api.PATCH('/api/v1/vouchers/{vid}/status', {
          params: { path: { vid: voucherId } },
          body: { is_active: isActive },
        }),
      ),
    onSuccess: saved,
  })
}

/**
 * Deletes a voucher no sale has used. Its page is still open when this
 * resolves: the caller leaves it, then drops it from the cache.
 */
export function useDeleteVoucher(voucherId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => unwrap(api.DELETE('/api/v1/vouchers/{vid}', { params: { path: { vid: voucherId } } })),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.vouchers.lists() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.vouchers.outlets() })
    },
  })
}
