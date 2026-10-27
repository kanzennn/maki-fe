import { createContext } from 'react'

import type { ReceiptOutlet } from '@/components/pos/receipt'
import type { Order } from '@/modules/pos/types'

/** A receipt to print: the order, and its outlet as the receipt shows it. */
export type PrintJob = { order: Order; outlet: ReceiptOutlet }

/** Prints a receipt (PrintProvider); usePrint reads it. */
export const PrintContext = createContext<((job: PrintJob) => void) | null>(null)
