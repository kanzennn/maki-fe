import { z } from 'zod'

import { MAX_STOCK } from '../types'

// The menu's rules count as the server does; it checks everything again and
// has the last word. Rules are shown from common:validation.

/** A text's length as the server counts it: an emoji is one character. */
export function chars(value: string): number {
  return [...value].length
}

/** A count typed into a field: digits only, which the number fields keep; empty, or at most MAX_STOCK. */
export const countRule = z.string().refine((v) => v === '' || Number(v) <= MAX_STOCK, 'range')
