import { createContext, useContext } from 'react'

import type { Order } from './api'
import type { ReceiptOutlet } from './components/Receipt'

/** A receipt to print: the order, and its outlet as the receipt shows it. */
export type PrintJob = { order: Order; outlet: ReceiptOutlet }

export const PrintContext = createContext<((job: PrintJob) => void) | null>(null)

/** Prints the order's receipt (components/PrintProvider). */
export function usePrint() {
  const print = useContext(PrintContext)
  if (!print) throw new Error('usePrint needs a PrintProvider')
  return (order: Order, outlet: ReceiptOutlet) => print({ order, outlet })
}
