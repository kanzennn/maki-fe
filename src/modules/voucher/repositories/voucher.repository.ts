import { apiPath, http, type Page, type QueryParams } from '@/lib/http'

import type { Voucher, VoucherInput, VoucherRedemption } from '../types'

/** The Owner's vouchers. */
export function listVouchers(params: QueryParams<'/vouchers'>): Promise<Page<Voucher>> {
  return http.getPaginated<Voucher>(apiPath('/vouchers'), params)
}

/** The vouchers an outlet's cashier can take, as its Manager sees them. */
export function listOutletVouchers(outletId: string, params: QueryParams<'/outlets/{oid}/vouchers'>): Promise<Page<Voucher>> {
  return http.getPaginated<Voucher>(apiPath('/outlets/{oid}/vouchers', { oid: outletId }), params)
}

export function getVoucher(voucherId: string): Promise<Voucher> {
  return http.get<Voucher>(apiPath('/vouchers/{vid}', { vid: voucherId }))
}

/** A page of the sales that used the voucher, newest first. */
export function listRedemptions(
  voucherId: string,
  params: QueryParams<'/vouchers/{vid}/redemptions'>,
): Promise<Page<VoucherRedemption>> {
  return http.getPaginated<VoucherRedemption>(apiPath('/vouchers/{vid}/redemptions', { vid: voucherId }), params)
}

export function createVoucher(body: VoucherInput): Promise<Voucher> {
  return http.post<Voucher>(apiPath('/vouchers'), body)
}

export function updateVoucher(voucherId: string, body: VoucherInput): Promise<Voucher> {
  return http.put<Voucher>(apiPath('/vouchers/{vid}', { vid: voucherId }), body)
}

export function setVoucherActive(voucherId: string, isActive: boolean): Promise<Voucher> {
  return http.patch<Voucher>(apiPath('/vouchers/{vid}/status', { vid: voucherId }), { is_active: isActive })
}

/** Deletes a voucher no sale has used. */
export function deleteVoucher(voucherId: string): Promise<void> {
  return http.delete(apiPath('/vouchers/{vid}', { vid: voucherId }))
}
