import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

import { PrintContext, type PrintJob } from './print-context'
import { Receipt } from '@/components/pos/receipt'

/**
 * Prints receipts through the browser, to the till's 58 mm printer: the
 * receipt goes into an element of its own outside the app's root, which the
 * print styles show alone (styles/globals.css). It stays there until the
 * printing is done.
 */
export function PrintProvider({ children }: { children: ReactNode }) {
  const [job, setJob] = useState<PrintJob | null>(null)

  useEffect(() => {
    if (!job) return
    const done = () => setJob(null)
    window.addEventListener('afterprint', done)
    window.print()
    return () => window.removeEventListener('afterprint', done)
  }, [job])

  return (
    <PrintContext value={(next) => setJob({ ...next })}>
      {children}
      {job &&
        createPortal(
          <div className="print-receipt">
            <Receipt order={job.order} outlet={job.outlet} />
          </div>,
          document.body,
        )}
    </PrintContext>
  )
}
