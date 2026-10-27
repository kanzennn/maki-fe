import type { AdjustmentType } from '../types'

/** The count an adjustment leaves: added to, taken from, or counted anew (a stock take). */
export function stockAfter(current: number, type: AdjustmentType, qty: number): number {
  if (type === 'in') return current + qty
  if (type === 'out') return current - qty
  return qty
}
