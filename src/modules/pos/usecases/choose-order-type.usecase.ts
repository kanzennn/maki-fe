import type { CartTable, OrderType } from '../types'

/** The cart's change for an order of type: a takeaway has no table, nor a stand, and lets go of them. */
export function chooseType(type: OrderType): { type: OrderType; table?: CartTable | null; standNumber?: string } {
  return type === 'takeaway' ? { type, table: null, standNumber: '' } : { type }
}
