import { z } from 'zod'

import { parsePercent } from '@/lib/percent'
import { parseOrThrow, ValidationError } from '@/lib/validation'

import type { Outlet, OutletFormValues, OutletInput } from '../types'

// Rules are shown from common:validation. They are the server's rules for an
// outlet; it checks everything again and has the last word.

const hour = /^([01][0-9]|2[0-3]):[0-5][0-9]$/

/** 0 to 100 with at most two decimals, typed with a comma or a point; empty is 0. */
const percent = z
  .string()
  .trim()
  .refine((v) => v === '' || /^\d+([.,]\d+)?$/.test(v), 'format')
  .refine((v) => !/[.,]\d{3,}$/.test(v), 'decimals')
  // Not a number is the format's to say.
  .refine((v) => !(parsePercent(v) > 100), 'range')

const outletSchema = z
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

/**
 * The outlet for the API from its form: trimmed, empty fields as no value,
 * percentages as numbers. A ValidationError names each field that breaks a rule.
 */
export function validateOutletForm(values: OutletFormValues): OutletInput {
  const v = parseOrThrow(outletSchema, values)
  return {
    code: v.code,
    name: v.name,
    address: v.address || null,
    phone: v.phone || null,
    timezone: v.timezone,
    locale: v.locale,
    open_time: v.open_time || null,
    close_time: v.close_time || null,
    tax_pct: parsePercent(v.tax_pct),
    service_pct: parsePercent(v.service_pct),
  }
}

/** Whether typed is the outlet's name, as the server checks it: the same letters and case, spaces around it aside. */
export function confirmsOutletName(outlet: Pick<Outlet, 'name'>, typed: string): boolean {
  return typed.trim() === outlet.name
}

/** The name typed to delete the outlet, or a ValidationError when it isn't the outlet's. */
export function validateOutletDeletion(outlet: Pick<Outlet, 'name'>, typed: string): string {
  if (!confirmsOutletName(outlet, typed)) throw new ValidationError({ confirm_name: 'mismatch' })
  return typed
}
