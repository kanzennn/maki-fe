import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { FormAlert } from '@/shared/components/FormMessage'
import { TextareaField } from '@/shared/components/TextareaField'
import { apiErrorMessage } from '@/shared/lib/api-error-message'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/dialog'

import { useVoidOrder, type Order } from '../api'

/** The most characters a void's reason has: the server's limit. */
const MAX_REASON = 200

/**
 * Voids a paid order, for a reason the spec requires: the order and its
 * payment are cancelled and the stock goes back. It can't be undone, so it
 * asks first; a refusal stays in the dialog.
 */
export function VoidDialog({ outletId, order, onDone }: { outletId: string; order: Order; onDone: () => void }) {
  const { t } = useTranslation('pos')
  const { t: tCommon } = useTranslation()
  const voidOrder = useVoidOrder(outletId, order.order_id)
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [fieldError, setFieldError] = useState<string | undefined>()
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    const trimmed = reason.trim()
    if (trimmed === '' || trimmed.length > MAX_REASON) {
      setFieldError(tCommon(trimmed === '' ? 'validation.required' : 'validation.max'))
      return
    }
    setFieldError(undefined)
    try {
      await voidOrder.mutateAsync(trimmed)
      setOpen(false)
      onDone()
    } catch (caught) {
      setError(apiErrorMessage(tCommon, caught))
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        setReason('')
        setFieldError(undefined)
        setError(null)
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="h-11 text-error">
          {t('void.action')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={(e) => void submit(e)} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{t('void.title', { number: order.order_no })}</DialogTitle>
            <DialogDescription>{t('void.body')}</DialogDescription>
          </DialogHeader>
          {error && <FormAlert>{error}</FormAlert>}
          <TextareaField
            label={t('void.reason')}
            hint={t('void.reasonHint')}
            error={fieldError}
            value={reason}
            maxLength={MAX_REASON}
            onChange={(e) => setReason(e.target.value)}
          />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" className="h-11">
                {tCommon('actions.cancel')}
              </Button>
            </DialogClose>
            <Button type="submit" variant="destructive" className="h-11" disabled={voidOrder.isPending}>
              {t('void.confirm')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
