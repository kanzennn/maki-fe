import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { FormAlert } from '@/components/shared/form-message'
import { TextareaField } from '@/components/shared/textarea-field'
import { useFieldError } from '@/hooks/use-field-error'
import { apiErrorMessage } from '@/lib/api-error-message'
import { ValidationError } from '@/lib/validation'
import { Button } from '@/components/shared/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/shared/dialog'

import { useVoidOrder } from '@/hooks/pos/pos.queries'
import { MAX_VOID_REASON, type Order } from '@/modules/pos/types'

/**
 * Voids a paid order, for a reason the spec requires: the order and its
 * payment are cancelled and the stock goes back. It can't be undone, so it
 * asks first; a refusal stays in the dialog.
 */
export function VoidDialog({ outletId, order, onDone }: { outletId: string; order: Order; onDone: () => void }) {
  const { t } = useTranslation('pos')
  const { t: tCommon } = useTranslation()
  const ruleMessage = useFieldError()
  const voidOrder = useVoidOrder(outletId, order.order_id)
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [fieldError, setFieldError] = useState<string | undefined>()
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setFieldError(undefined)
    try {
      await voidOrder.mutateAsync(reason)
      setOpen(false)
      onDone()
    } catch (caught) {
      if (caught instanceof ValidationError) setFieldError(ruleMessage({ type: 'validate', message: caught.fields.reason }))
      else setError(apiErrorMessage(tCommon, caught))
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
            maxLength={MAX_VOID_REASON}
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
