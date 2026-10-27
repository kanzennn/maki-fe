import { z } from 'zod'

import { parseOrThrow } from '@/lib/validation'

import type { CategoryFormValues, CategoryInput } from '../types'
import { chars } from './count.validation'

/**
 * The server's rule for a category's icon: at least one pictographic
 * symbol, or a keycap as in 1️⃣, and no letters, spaces or control
 * characters. Emoji are such symbols, joined by zero-width joiners and
 * variation selectors; "??" or "12" isn't one.
 */
export function emojiLike(value: string): boolean {
  return !/[\p{L}\s\p{Cc}]/u.test(value) && /[\p{So}⃣]/u.test(value)
}

const categorySchema = z.object({
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

/** The category for the API from its form: trimmed, no icon for an empty one. */
export function validateCategoryForm(values: CategoryFormValues): CategoryInput {
  const v = parseOrThrow(categorySchema, values)
  return { name: v.name, icon: v.icon || null }
}
