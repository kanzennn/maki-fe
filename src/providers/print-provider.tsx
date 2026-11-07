import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

import { PrintContext, type PrintJob } from './print-context'
import { Receipt } from '@/components/pos/receipt'
import { usePrintSettings, type PaperWidth } from '@/hooks/pos/use-print-settings'

const pixelsPerMillimetre = 96 / 25.4

/**
 * The page's size for a receipt this tall. CSS has no "as long as it takes"
 * for a roll (`size: 58mm auto` is invalid, and browsers drop it for their
 * default paper), so the receipt is measured. The spare millimetres keep
 * rounding from starting a second page.
 */
function pageRule(paper: PaperWidth, heightInPixels: number) {
  const height = Math.ceil(heightInPixels / pixelsPerMillimetre) + 2
  return `@page { size: ${paper}mm ${height}mm; margin: 0; }`
}

/**
 * Prints receipts through the browser, to the till's printer as Windows knows
 * it, on the roll the till is set to: the receipt goes into an element of its
 * own outside the app's root, which the print styles show alone
 * (styles/globals.css). It stays there until the printing is done. A browser
 * started with --kiosk-printing skips the print dialog (docs/README.md).
 */
export function PrintProvider({ children }: { children: ReactNode }) {
  const [job, setJob] = useState<(PrintJob & { paper: PaperWidth }) | null>(null)
  const receipt = useRef<HTMLDivElement>(null)
  const page = useRef<HTMLStyleElement>(null)

  useEffect(() => {
    if (!job) return
    if (page.current && receipt.current) {
      page.current.textContent = pageRule(job.paper, receipt.current.getBoundingClientRect().height)
    }
    const done = () => setJob(null)
    window.addEventListener('afterprint', done)
    window.print()
    return () => window.removeEventListener('afterprint', done)
  }, [job])

  return (
    <PrintContext value={(next) => setJob({ ...next, paper: usePrintSettings.getState().paper })}>
      {children}
      {job &&
        createPortal(
          <>
            <style ref={page} />
            <div ref={receipt} className="print-receipt" data-paper={job.paper}>
              <Receipt order={job.order} outlet={job.outlet} />
            </div>
          </>,
          document.body,
        )}
    </PrintContext>
  )
}
