import { createContext, useContext } from 'react'

/**
 * Below 840px, the element just above the cashier's bottom navigation, for
 * the cart bar (DESIGN.md, Phone and narrow screens): one fixed bar holds
 * both, whatever the navigation's height. Null from 840px, where the cart is
 * a panel of the page.
 */
export const BottomSlotContext = createContext<HTMLElement | null>(null)

export function useBottomSlot() {
  return useContext(BottomSlotContext)
}
