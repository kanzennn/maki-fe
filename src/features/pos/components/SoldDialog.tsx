import { CheckCircle2Icon, PrinterIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { formatRupiah } from '@/shared/lib/money'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'

import type { Order } from '../api'
import { usePrint } from '../print-context'
import { Receipt, type ReceiptOutlet } from './Receipt'

/**
 * The sale is saved: the change to hand back, the receipt to look over or
 * print, and the way to the next customer.
 */
export function SoldDialog({
  order,
  outlet,
  onClose,
}: {
  order: Order | null
  outlet: ReceiptOutlet
  onClose: () => void
}) {
  const { t, i18n } = useTranslation('pos')
  const print = usePrint()

  return (
    <Dialog open={order !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        {order && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2Icon aria-hidden="true" className="size-6 text-primary" />
                {t('done.title')}
              </DialogTitle>
              {order.payment.change !== null && (
                <DialogDescription className="text-headline-md text-on-surface">
                  {t('done.change', { amount: formatRupiah(order.payment.change, i18n.language) })}
                </DialogDescription>
              )}
            </DialogHeader>
            <div className="max-h-[50dvh] overflow-y-auto rounded-card border border-outline bg-surface-container-low p-4">
              <Receipt order={order} outlet={outlet} className="mx-auto max-w-72" />
            </div>
            <DialogFooter>
              <Button variant="outline" className="h-12" onClick={() => print(order, outlet)}>
                <PrinterIcon aria-hidden="true" />
                {t('done.print')}
              </Button>
              <Button className="h-12 text-title-md" onClick={onClose} autoFocus>
                {t('done.new')}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
