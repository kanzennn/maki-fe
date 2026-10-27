import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/hooks/query-keys'
import type { RedemptionsState, Voucher, VoucherFormValues, VoucherListState } from '@/modules/voucher/types'
import { createVoucher } from '@/modules/voucher/usecases/create-voucher.usecase'
import { deleteVoucher } from '@/modules/voucher/usecases/delete-voucher.usecase'
import { getVoucher } from '@/modules/voucher/usecases/get-voucher.usecase'
import { listOutletVouchers } from '@/modules/voucher/usecases/list-outlet-vouchers.usecase'
import { listRedemptions } from '@/modules/voucher/usecases/list-redemptions.usecase'
import { listVouchers } from '@/modules/voucher/usecases/list-vouchers.usecase'
import { setVoucherActive } from '@/modules/voucher/usecases/set-voucher-active.usecase'
import { updateVoucher } from '@/modules/voucher/usecases/update-voucher.usecase'

/** The Owner's vouchers. */
export const voucherListQuery = (state: VoucherListState) =>
  queryOptions({
    queryKey: [...queryKeys.vouchers.lists(), state] as const,
    queryFn: () => listVouchers(state),
  })

/** The vouchers an outlet's cashier can take, as its Manager sees them. */
export const outletVoucherListQuery = (outletId: string, state: VoucherListState) =>
  queryOptions({
    queryKey: [...queryKeys.vouchers.outlet(outletId), state] as const,
    queryFn: () => listOutletVouchers(outletId, state),
  })

export const voucherQuery = (voucherId: string) =>
  queryOptions({
    queryKey: queryKeys.vouchers.detail(voucherId),
    queryFn: () => getVoucher(voucherId),
  })

/** A page of the sales that used the voucher, newest first. */
export const redemptionsQuery = (voucherId: string, state: RedemptionsState) =>
  queryOptions({
    queryKey: [...queryKeys.vouchers.redemptions(voucherId), state] as const,
    queryFn: () => listRedemptions(voucherId, state),
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
    mutationFn: (values: VoucherFormValues) => createVoucher(values),
    onSuccess: saved,
  })
}

export function useUpdateVoucher(voucherId: string) {
  const saved = useSaved()
  return useMutation({
    mutationFn: (values: VoucherFormValues) => updateVoucher(voucherId, values),
    onSuccess: saved,
  })
}

export function useSetVoucherActive(voucherId: string) {
  const saved = useSaved()
  return useMutation({
    mutationFn: (isActive: boolean) => setVoucherActive(voucherId, isActive),
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
    mutationFn: () => deleteVoucher(voucherId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.vouchers.lists() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.vouchers.outlets() })
    },
  })
}
