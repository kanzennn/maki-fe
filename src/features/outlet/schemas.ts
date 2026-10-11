import { z } from 'zod'

import { parsePercent, showPercent } from '@/shared/lib/percent'

import type { Outlet, OutletInput } from './api'

// Messages are rules, shown from common:validation (useFieldError). They are
// the server's rules for an outlet; it checks everything again and has the
// last word.

const hour = /^([01][0-9]|2[0-3]):[0-5][0-9]$/

/** 0 to 100 with at most two decimals, typed with a comma or a point; empty is 0. */
const percent = z
  .string()
  .trim()
  .refine((v) => v === '' || /^\d+([.,]\d+)?$/.test(v), 'format')
  .refine((v) => !/[.,]\d{3,}$/.test(v), 'decimals')
  // Not a number is the format's to say.
  .refine((v) => !(parsePercent(v) > 100), 'range')

export const outletSchema = z
  .object({
    code: z.string().trim().regex(/^[A-Za-z0-9]{2,10}$/, 'format'),
    name: z.string().trim().min(1, 'required').max(100, 'max'),
    address: z.string().trim().max(500, 'max'),
    phone: z.string().trim().max(32, 'max'),
    timezone: z.string().min(1, 'required'),
    locale: z.enum(['id', 'en']),
    open_time: z.string().refine((v) => v === '' || hour.test(v), 'format'),
    close_time: z.string().refine((v) => v === '' || hour.test(v), 'format'),
    tax_pct: percent,
    service_pct: percent,
  })
  .superRefine((v, ctx) => {
    // Opening hours are both set or both left out; they may run past midnight.
    if (v.open_time && !v.close_time) ctx.addIssue({ code: 'custom', path: ['close_time'], message: 'required' })
    if (!v.open_time && v.close_time) ctx.addIssue({ code: 'custom', path: ['open_time'], message: 'required' })
    if (v.open_time && v.open_time === v.close_time) {
      ctx.addIssue({ code: 'custom', path: ['close_time'], message: 'different' })
    }
  })

export type OutletValues = z.infer<typeof outletSchema>

/** The form's fields, which the server's validation_failed answers name too. */
export const outletFields = [
  'code',
  'name',
  'address',
  'phone',
  'timezone',
  'locale',
  'open_time',
  'close_time',
  'tax_pct',
  'service_pct',
] as const satisfies readonly (keyof OutletValues)[]

/** The form's starting values: an outlet's, or a new outlet's defaults. */
export function outletValues(language: string, outlet?: Outlet): OutletValues {
  return {
    code: outlet?.code ?? '',
    name: outlet?.name ?? '',
    address: outlet?.address ?? '',
    phone: outlet?.phone ?? '',
    timezone: outlet?.timezone ?? 'Asia/Jakarta',
    locale: outlet?.locale ?? 'id',
    open_time: outlet?.open_time ?? '',
    close_time: outlet?.close_time ?? '',
    tax_pct: outlet ? showPercent(outlet.tax_pct, language) : '0',
    service_pct: outlet ? showPercent(outlet.service_pct, language) : '0',
  }
}

export function toOutletInput(values: OutletValues): OutletInput {
  return {
    code: values.code.trim(),
    name: values.name.trim(),
    address: values.address.trim() || null,
    phone: values.phone.trim() || null,
    timezone: values.timezone,
    locale: values.locale,
    open_time: values.open_time || null,
    close_time: values.close_time || null,
    tax_pct: parsePercent(values.tax_pct),
    service_pct: parsePercent(values.service_pct),
  }
}
