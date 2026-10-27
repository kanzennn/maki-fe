import { useContext } from 'react'

import type { ReceiptOutlet } from '@/components/pos/receipt'
import type { Order } from '@/modules/pos/types'
import { PrintContext } from '@/providers/print-context'

/** Prints the order's receipt (providers/print-provider). */
export function usePrint() {
  const print = useContext(PrintContext)
  if (!print) throw new Error('usePrint needs a PrintProvider')
  return (order: Order, outlet: ReceiptOutlet) => print({ order, outlet })
}
