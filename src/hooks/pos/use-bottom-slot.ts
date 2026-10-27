import { useContext } from 'react'

import { BottomSlotContext } from '@/providers/bottom-slot-context'

/** The element for the cart bar above the cashier's bottom navigation, or null where there is none. */
export function useBottomSlot() {
  return useContext(BottomSlotContext)
}
