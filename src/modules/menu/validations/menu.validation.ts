import { z } from 'zod'

import { parseOrThrow } from '@/lib/validation'

import { MAX_PRICE, type Menu, type MenuFormValues, type MenuInput } from '../types'
import { chars, countRule } from './count.validation'

/** A menu's form by the server's rules; wasTracked is whether it tracks its stock already. */
function menuSchema(wasTracked: boolean) {
  return z
    .object({
      name: z
        .string()
        .trim()
        .min(1, 'required')
        .refine((v) => chars(v) <= 100, 'max'),
      category_id: z.string().min(1, 'required'),
      price: z
        .string()
        .min(1, 'required')
        .refine((v) => Number(v) <= MAX_PRICE, 'range'),
      description: z
        .string()
        .trim()
        .refine((v) => chars(v) <= 500, 'max'),
      sku: z
        .string()
        .trim()
        .refine((v) => v === '' || /^[A-Za-z0-9._-]{1,32}$/.test(v), 'format'),
      track_stock: z.boolean(),
      initial_stock: countRule,
      stock_alert: countRule,
      is_active: z.boolean(),
    })
    .superRefine((v, ctx) => {
      // Tracking starts from a count; a menu tracked already changes its
      // count through adjustments.
      if (v.track_stock && !wasTracked && v.initial_stock === '') {
        ctx.addIssue({ code: 'custom', path: ['initial_stock'], message: 'required' })
      }
    })
}

/**
 * The body for the menu, new (no menu) or changed. The starting count goes
 * only when tracking starts, the alert only for a tracked menu, and the
 * status only for a new menu: an existing one changes it with its own action.
 */
export function validateMenuForm(values: MenuFormValues, menu?: Pick<Menu, 'track_stock'>): MenuInput {
  const v = parseOrThrow(menuSchema(menu?.track_stock ?? false), values)
  const starting = v.track_stock && !menu?.track_stock
  return {
    name: v.name,
    category_id: v.category_id,
    price: Number(v.price),
    description: v.description || null,
    sku: v.sku || null,
    track_stock: v.track_stock,
    initial_stock: starting ? Number(v.initial_stock) : null,
    stock_alert: v.track_stock && v.stock_alert !== '' ? Number(v.stock_alert) : null,
    is_active: menu ? null : v.is_active,
  }
}
