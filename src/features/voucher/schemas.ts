import { z } from 'zod'

import { parsePercent, showPercent } from '@/shared/lib/percent'
import { fromZonedInput, toZonedInput } from '@/shared/lib/time'

import type { Voucher, VoucherInput } from './api'

// Messages are rules, shown from common:validation (useFieldError). They are
// the server's rules for a voucher; it checks everything again, including
// what only it can tell (a code taken, a used voucher's locked fields), and
// has the last word.

/** The most rupiah an amount, a maximum or a minimum spend may be: an order's subtotal at most. */
export const MAX_AMOUNT = 1_000_000_000
export const MAX_QUOTA = 1_000_000

/** Vouchers run on WIB, whatever the outlet or the browser: UTC+7, without daylight saving. */
export const WIB = 'Asia/Jakarta'

/** A datetime-local field's value: a day and a time, to the minute. */
const localTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/

/** An instant as a datetime-local field shows it in WIB: 2026-08-17T00:00. */
export function toWibInput(iso: string): string {
  return toZonedInput(iso, WIB)
}

/** A datetime-local field's value, read as WIB, as the instant the API takes. */
export function fromWibInput(value: string): string {
  return fromZonedInput(value, WIB)
}

const digits = (v: string) => (v === '' ? null : Number(v))

export const voucherSchema = z
  .object({
    code: z.string().trim().min(1, 'required').regex(/^[A-Za-z0-9]{3,20}$/, 'format'),
    name: z.string().trim().max(100, 'max'),
    type: z.enum(['percent', 'amount']),
    /** A percentage, typed with a comma or a point; an amount, as digits. */
    value: z.string().trim(),
    max_discount: z.string(),
    min_spend: z.string(),
    quota: z.string(),
    start_at: z.string(),
    expired_at: z.string(),
    all_outlets: z.boolean(),
    outlet_ids: z.array(z.string()),
    is_active: z.boolean(),
  })
  .superRefine((v, ctx) => {
    const fail = (path: string, message: string) => ctx.addIssue({ code: 'custom', path: [path], message })
    const amount = (path: string, value: string, max: number) => {
      const n = digits(value)
      if (n !== null && (n < 1 || n > max)) fail(path, 'range')
    }

    if (v.value === '') fail('value', 'required')
    else if (v.type === 'percent') {
      // At most two decimals, more than 0 and up to 100.
      if (!/^\d+([.,]\d+)?$/.test(v.value)) fail('value', 'format')
      else if (/[.,]\d{3,}$/.test(v.value)) fail('value', 'decimals')
      else if (!(parsePercent(v.value) > 0 && parsePercent(v.value) <= 100)) fail('value', 'range')
    } else amount('value', v.value, MAX_AMOUNT)

    if (v.type === 'percent') amount('max_discount', v.max_discount, MAX_AMOUNT)
    amount('min_spend', v.min_spend, MAX_AMOUNT)
    if (v.quota === '') fail('quota', 'required')
    else amount('quota', v.quota, MAX_QUOTA)

    if (v.start_at !== '' && !localTime.test(v.start_at)) fail('start_at', 'format')
    if (v.expired_at === '') fail('expired_at', 'required')
    else if (!localTime.test(v.expired_at)) fail('expired_at', 'format')
    // Both read as WIB, so their text compares as their times do.
    else if (v.start_at !== '' && localTime.test(v.start_at) && v.expired_at <= v.start_at) fail('expired_at', 'after')

    if (!v.all_outlets && v.outlet_ids.length === 0) fail('outlet_ids', 'required')
  })

export type VoucherValues = z.infer<typeof voucherSchema>

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
] as const satisfies readonly (keyof VoucherValues)[]

/** The form's starting values: a voucher's, or a new voucher's defaults. */
export function voucherValues(language: string, voucher?: Voucher): VoucherValues {
  const value = voucher
    ? voucher.type === 'percent'
      ? showPercent(voucher.value / 100, language)
      : String(voucher.value)
    : ''
  return {
    code: voucher?.code ?? '',
    name: voucher?.name ?? '',
    type: voucher?.type ?? 'percent',
    value,
    max_discount: voucher?.max_discount != null ? String(voucher.max_discount) : '',
    min_spend: voucher?.min_spend != null ? String(voucher.min_spend) : '',
    quota: voucher ? String(voucher.quota) : '',
    start_at: voucher?.start_at ? toWibInput(voucher.start_at) : '',
    expired_at: voucher ? toWibInput(voucher.expired_at) : '',
    all_outlets: voucher?.all_outlets ?? true,
    outlet_ids: voucher?.outlets.map((o) => o.outlet_id) ?? [],
    is_active: voucher?.is_active ?? true,
  }
}

export function toVoucherInput(values: VoucherValues): VoucherInput {
  const percent = values.type === 'percent'
  return {
    code: values.code.trim().toUpperCase(),
    name: values.name.trim() || null,
    type: values.type,
    // Basis points: 12,5% is 1250.
    value: percent ? Math.round(parsePercent(values.value) * 100) : Number(values.value),
    max_discount: percent ? digits(values.max_discount) : null,
    min_spend: digits(values.min_spend),
    quota: Number(values.quota),
    start_at: values.start_at ? fromWibInput(values.start_at) : null,
    expired_at: fromWibInput(values.expired_at),
    all_outlets: values.all_outlets,
    outlet_ids: values.all_outlets ? [] : values.outlet_ids,
    is_active: values.is_active,
  }
}
