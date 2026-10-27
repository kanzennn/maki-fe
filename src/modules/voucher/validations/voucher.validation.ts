import { z } from 'zod'

import { parsePercent } from '@/lib/percent'
import { fromZonedInput, isZonedInput } from '@/lib/time'
import { parseOrThrow } from '@/lib/validation'

import { MAX_AMOUNT, MAX_QUOTA, WIB, type VoucherFormValues, type VoucherInput } from '../types'

// Rules are shown from common:validation. They are the server's rules for a
// voucher; it checks everything again, including what only it can tell (a
// code taken, a used voucher's locked fields), and has the last word.

const digits = (v: string) => (v === '' ? null : Number(v))

const voucherSchema = z
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

    if (v.start_at !== '' && !isZonedInput(v.start_at)) fail('start_at', 'format')
    if (v.expired_at === '') fail('expired_at', 'required')
    else if (!isZonedInput(v.expired_at)) fail('expired_at', 'format')
    // Both read as WIB, so their text compares as their times do.
    else if (v.start_at !== '' && isZonedInput(v.start_at) && v.expired_at <= v.start_at) fail('expired_at', 'after')

    if (!v.all_outlets && v.outlet_ids.length === 0) fail('outlet_ids', 'required')
  })

/**
 * The voucher for the API from its form: the code in capitals, a percentage
 * in basis points (12,5% is 1250), times read as WIB, and nothing that
 * doesn't apply — an amount has no maximum, a voucher for every outlet no list.
 */
export function validateVoucherForm(values: VoucherFormValues): VoucherInput {
  const v = parseOrThrow(voucherSchema, values)
  const percent = v.type === 'percent'
  return {
    code: v.code.toUpperCase(),
    name: v.name || null,
    type: v.type,
    value: percent ? Math.round(parsePercent(v.value) * 100) : Number(v.value),
    max_discount: percent ? digits(v.max_discount) : null,
    min_spend: digits(v.min_spend),
    quota: Number(v.quota),
    start_at: v.start_at ? fromZonedInput(v.start_at, WIB) : null,
    expired_at: fromZonedInput(v.expired_at, WIB),
    all_outlets: v.all_outlets,
    outlet_ids: v.all_outlets ? [] : v.outlet_ids,
    is_active: v.is_active,
  }
}
