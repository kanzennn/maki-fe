import type { components } from '@/lib/api-schema'

export type Voucher = components['schemas']['Voucher']
export type VoucherInput = components['schemas']['VoucherInput']
export type VoucherStatus = components['schemas']['VoucherStatus']
export type VoucherType = components['schemas']['VoucherType']
export type VoucherRedemption = components['schemas']['VoucherRedemption']

export const voucherStatuses = ['active', 'scheduled', 'used_up', 'expired', 'inactive'] as const satisfies readonly VoucherStatus[]

/** The most rupiah an amount, a maximum or a minimum spend may be: an order's subtotal at most. */
export const MAX_AMOUNT = 1_000_000_000
export const MAX_QUOTA = 1_000_000

/** Vouchers run on WIB, whatever the outlet or the browser: UTC+7, without daylight saving. */
export const WIB = 'Asia/Jakarta'

/** A voucher list as its page shows it: search text, status, page. */
export type VoucherListState = { q?: string; status?: VoucherStatus; page?: number }

/** A voucher's history of sales as its page shows it: which page. */
export type RedemptionsState = { page?: number }

/**
 * A voucher's form, as typed: a percentage with a comma or a point, amounts
 * as digits, times as a datetime-local field holds them, in WIB.
 */
export type VoucherFormValues = {
  code: string
  name: string
  type: VoucherType
  value: string
  max_discount: string
  min_spend: string
  quota: string
  start_at: string
  expired_at: string
  all_outlets: boolean
  outlet_ids: string[]
  is_active: boolean
}

/** The form's fields, which the server's validation_failed answers name too. */
export const voucherFields = [
  'code',
  'name',
  'type',
  'value',
  'max_discount',
  'min_spend',
  'quota',
  'start_at',
  'expired_at',
  'all_outlets',
  'outlet_ids',
  'is_active',
] as const satisfies readonly (keyof VoucherFormValues)[]
