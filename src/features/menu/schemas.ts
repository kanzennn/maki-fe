import { z } from 'zod'

import type { Category, CategoryInput, Menu, MenuInput, StockAdjustment } from './api'

// Messages are rules, shown from common:validation. They are the server's
// rules for categories, menus and stock; it checks everything again and has
// the last word. Lengths count characters as the server does, so an emoji
// is one.

/** Rupiah, the most a menu may cost. */
export const MAX_PRICE = 100_000_000
/** The most a count, an alert or one adjustment may be. */
export const MAX_STOCK = 1_000_000

const chars = (value: string) => [...value].length

/**
 * The server's rule for a category's icon: at least one pictographic
 * symbol, or a keycap as in 1️⃣, and no letters, spaces or control
 * characters. Emoji are such symbols, joined by zero-width joiners and
 * variation selectors; "??" or "12" isn't one.
 */
export function emojiLike(value: string): boolean {
  return !/[\p{L}\s\p{Cc}]/u.test(value) && /[\p{So}\u20E3]/u.test(value)
}

export const categorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'required')
    .refine((v) => chars(v) <= 50, 'max'),
  icon: z
    .string()
    .trim()
    .refine((v) => chars(v) <= 8, 'max')
    .refine((v) => v === '' || emojiLike(v), 'format'),
})

export type CategoryValues = z.infer<typeof categorySchema>

export const categoryFields = ['name', 'icon'] as const satisfies readonly (keyof CategoryValues)[]

export function categoryValues(category?: Category): CategoryValues {
  return { name: category?.name ?? '', icon: category?.icon ?? '' }
}

export function toCategoryInput(values: CategoryValues): CategoryInput {
  return { name: values.name.trim(), icon: values.icon.trim() || null }
}

/** A count typed into a field: digits only, which the number fields keep. */
const count = z.string().refine((v) => v === '' || Number(v) <= MAX_STOCK, 'range')

/**
 * A menu as the form holds it: numbers as the digits typed. wasTracked is
 * whether the menu tracks its stock already; if it doesn't, tracking starts
 * from a count.
 */
export function menuSchema(wasTracked: boolean) {
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
      initial_stock: count,
      stock_alert: count,
      is_active: z.boolean(),
    })
    .superRefine((v, ctx) => {
      if (v.track_stock && !wasTracked && v.initial_stock === '') {
        ctx.addIssue({ code: 'custom', path: ['initial_stock'], message: 'required' })
      }
    })
}

export type MenuValues = z.infer<ReturnType<typeof menuSchema>>

export const menuFields = [
  'name',
  'category_id',
  'price',
  'description',
  'sku',
  'track_stock',
  'initial_stock',
  'stock_alert',
] as const satisfies readonly (keyof MenuValues)[]

export function menuValues(menu?: Menu): MenuValues {
  return {
    name: menu?.name ?? '',
    category_id: menu?.category.category_id ?? '',
    price: menu ? String(menu.price) : '',
    description: menu?.description ?? '',
    sku: menu?.sku ?? '',
    track_stock: menu?.track_stock ?? false,
    initial_stock: '',
    stock_alert: menu?.stock_alert != null ? String(menu.stock_alert) : '',
    is_active: menu?.is_active ?? true,
  }
}

/**
 * The body for the menu, new or changed. The starting count goes only when
 * tracking starts, the alert only for a tracked menu, and the status only
 * for a new menu: an existing one changes it with its own action.
 */
export function toMenuInput(values: MenuValues, menu?: Menu): MenuInput {
  const starting = values.track_stock && !menu?.track_stock
  return {
    name: values.name.trim(),
    category_id: values.category_id,
    price: Number(values.price),
    description: values.description.trim() || null,
    sku: values.sku.trim() || null,
    track_stock: values.track_stock,
    initial_stock: starting ? Number(values.initial_stock) : null,
    stock_alert: values.track_stock && values.stock_alert !== '' ? Number(values.stock_alert) : null,
    is_active: menu ? null : values.is_active,
  }
}

export type AdjustmentType = StockAdjustment['type']
export type AdjustmentReason = StockAdjustment['reason']

/** The reason an adjustment of each type most often has, picked to start with. */
export const usualReason: Record<AdjustmentType, AdjustmentReason> = {
  in: 'restock',
  out: 'damaged',
  set: 'correction',
}

/** The count an adjustment leaves. */
export function stockAfter(current: number, type: AdjustmentType, qty: number): number {
  if (type === 'in') return current + qty
  if (type === 'out') return current - qty
  return qty
}

/**
 * An adjustment of a count that stands at current: something to add or
 * take (a stock take may find none), never more than there is, and never
 * past MAX_STOCK. A reason of other says what in the note.
 */
export function adjustmentSchema(current: number) {
  return z
    .object({
      type: z.enum(['in', 'out', 'set']),
      qty: z.string().min(1, 'required'),
      reason: z.enum(['restock', 'damaged', 'correction', 'other']),
      note: z
        .string()
        .trim()
        .refine((v) => chars(v) <= 200, 'max'),
    })
    .superRefine((v, ctx) => {
      const qty = Number(v.qty)
      const after = stockAfter(current, v.type, qty)
      if (v.qty !== '') {
        const rule =
          (v.type !== 'set' && qty < 1) || qty > MAX_STOCK || after > MAX_STOCK ? 'range' : after < 0 ? 'insufficient' : null
        if (rule) ctx.addIssue({ code: 'custom', path: ['qty'], message: rule })
      }
      if (v.reason === 'other' && v.note === '') {
        ctx.addIssue({ code: 'custom', path: ['note'], message: 'required' })
      }
    })
}

export type AdjustmentValues = z.infer<ReturnType<typeof adjustmentSchema>>

export const adjustmentFields = ['type', 'qty', 'reason', 'note'] as const satisfies readonly (keyof AdjustmentValues)[]

export function toAdjustment(values: AdjustmentValues): StockAdjustment {
  return { type: values.type, qty: Number(values.qty), reason: values.reason, note: values.note.trim() || null }
}

export const alertSchema = z.object({ stock_alert: count })

export type AlertValues = z.infer<typeof alertSchema>

/** The alert as the API takes it: none for an empty field. */
export function toAlert(values: AlertValues): number | null {
  return values.stock_alert === '' ? null : Number(values.stock_alert)
}
