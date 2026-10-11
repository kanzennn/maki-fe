import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { NumberField } from '@/shared/components/NumberField'
import { FormAlert } from '@/shared/components/FormMessage'
import { formatRupiah } from '@/shared/lib/money'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'

/** The quick amounts the spec names, after the exact one. */
const quick = [50_000, 100_000]

/** The most cash one payment takes in: the server's limit. */
export const MAX_RECEIVED = 100_000_000_000

/**
 * Paying in cash: what the customer hands over — typed, or a quick amount —
 * and the change, worked out as it is typed. Pay stays off until the cash
 * covers the total. When the sale gets no answer, the dialog stays, with the
 * same sale to send again.
 */
export function PaymentDialog({
  open,
  total,
  sending,
  unknown,
  onPay,
  onResend,
  onAbandon,
  onClose,
}: {
  open: boolean
  total: number
  /** The sale is on its way. */
  sending: boolean
  /** The sale went without an answer: it may have been taken. */
  unknown: boolean
  onPay: (received: number) => void
  onResend: () => void
  onAbandon: () => void
  onClose: () => void
}) {
  const { t, i18n } = useTranslation('pos')
  const { t: tCommon } = useTranslation()
  const [digits, setDigits] = useState('')
  const received = digits === '' ? 0 : Number(digits)
  const money = (amount: number) => formatRupiah(amount, i18n.language)
  const covered = digits !== '' && received >= total && received <= MAX_RECEIVED

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // A sale on its way can't be walked away from.
        if (!next && !sending) {
          setDigits('')
          onClose()
        }
      }}
    >
      <DialogContent showCloseButton={!sending}>
        <form
          noValidate
          className="grid gap-5"
          onSubmit={(e) => {
            e.preventDefault()
            if (covered && !sending && !unknown) onPay(received)
          }}
        >
          <DialogHeader>
            <DialogTitle>{t('pay.title')}</DialogTitle>
            <DialogDescription className="grid gap-1">
              <span>{t('pay.total')}</span>
              <span className="text-headline-lg text-on-surface">{money(total)}</span>
            </DialogDescription>
          </DialogHeader>

          {unknown ? (
            <div className="grid gap-3">
              <FormAlert>{t('pay.unknown')}</FormAlert>
              <Button type="button" className="h-12 text-title-md" disabled={sending} onClick={onResend}>
                {sending ? t('pay.sending') : t('pay.resend')}
              </Button>
              <Button type="button" variant="outline" className="h-11" disabled={sending} onClick={onAbandon}>
                {t('pay.abandon')}
              </Button>
              <p className="text-label-md text-on-surface-variant">{t('pay.abandonWarning')}</p>
            </div>
          ) : (
            <>
              <NumberField
                label={t('pay.received')}
                prefix="Rp"
                maxDigits={12}
                value={digits}
                onChange={setDigits}
                disabled={sending}
                autoFocus
              />
              <fieldset disabled={sending} className="grid gap-2">
                <legend className="sr-only">{t('pay.quick')}</legend>
                <div className="grid grid-cols-3 gap-2">
                  <QuickAmount label={t('pay.exact')} amount={total} total={total} onPick={setDigits} />
                  {quick.map((amount) => (
                    <QuickAmount key={amount} label={money(amount)} amount={amount} total={total} onPick={setDigits} />
                  ))}
                </div>
              </fieldset>
              <p
                aria-live="polite"
                className={cn(
                  'flex items-baseline justify-between gap-3 rounded-tile border px-4 py-3',
                  digits !== '' && !covered
                    ? 'border-error-container bg-error-container text-on-error-container'
                    : 'border-outline bg-surface-container-low text-on-surface',
                )}
              >
                <span className="text-title-md">{t('pay.change')}</span>
                <span className="text-headline-md">
                  {digits === ''
                    ? money(0)
                    : received < total
                      ? t('pay.short', { amount: money(total - received) })
                      : money(received - total)}
                </span>
              </p>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  className="h-12"
                  disabled={sending}
                  onClick={() => {
                    setDigits('')
                    onClose()
                  }}
                >
                  {tCommon('actions.cancel')}
                </Button>
                <Button type="submit" className="h-12 min-w-32 text-title-md" disabled={!covered || sending}>
                  {sending ? t('pay.sending') : t('pay.confirm')}
                </Button>
              </DialogFooter>
            </>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** A quick amount: off when it doesn't cover the total. */
function QuickAmount({
  label,
  amount,
  total,
  onPick,
}: {
  label: string
  amount: number
  total: number
  onPick: (digits: string) => void
}) {
  return (
    <Button
      type="button"
      variant="outline"
      className="h-12 px-2 text-title-md whitespace-normal"
      disabled={amount < total}
      onClick={() => onPick(String(amount))}
    >
      {label}
    </Button>
  )
}
