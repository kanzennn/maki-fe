import { z } from 'zod'

import { parseOrThrow } from '@/lib/validation'

import { adjustmentReasons, MAX_STOCK, type AdjustmentFormValues, type StockAdjustment, type StockAlertFormValues } from '../types'
import { stockAfter } from '../usecases/stock-after.usecase'
import { chars, countRule } from './count.validation'

/**
 * An adjustment of a count that stands at current: something to add or
 * take (a stock take may find none), never more than there is, and never
 * past MAX_STOCK. A reason of other says what in the note.
 */
function adjustmentSchema(current: number) {
  return z
    .object({
      type: z.enum(['in', 'out', 'set']),
      qty: z.string().min(1, 'required'),
      reason: z.enum(adjustmentReasons),
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

/** The adjustment for the API, of a count that stands at current: numbers, and no note for an empty one. */
export function validateAdjustment(values: AdjustmentFormValues, current: number): StockAdjustment {
  const v = parseOrThrow(adjustmentSchema(current), values)
  return { type: v.type, qty: Number(v.qty), reason: v.reason, note: v.note || null }
}

const alertSchema = z.object({ stock_alert: countRule })

/** The low-stock alert as the API takes it: none for an empty field. */
export function validateStockAlert(values: StockAlertFormValues): number | null {
  const v = parseOrThrow(alertSchema, values)
  return v.stock_alert === '' ? null : Number(v.stock_alert)
}
