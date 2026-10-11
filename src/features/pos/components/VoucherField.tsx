import { TicketPercentIcon, XIcon } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { apiErrorMessage } from '@/shared/lib/api-error-message'
import { formatRupiah } from '@/shared/lib/money'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'

import type { PosVoucher } from '../api'

/**
 * The voucher the customer gives, one per order: typed, checked with the
 * server, then shown with the way to take it off. While the subtotal is
 * short of its minimum spend it says so, and the sale can't take it yet.
 */
export function VoucherField({
  voucher,
  applies,
  locked,
  onApply,
  onRemove,
}: {
  voucher: PosVoucher | null
  /** False while the subtotal is short of the voucher's minimum spend. */
  applies: boolean
  /** An order is on its way: the voucher stays as it was sent. */
  locked: boolean
  /** Checks the code; rejects with the server's refusal. */
  onApply: (code: string) => Promise<unknown>
  onRemove: () => void
}) {
  const { t, i18n } = useTranslation('pos')
  const { t: tCommon } = useTranslation()
  const id = useId()
  const [code, setCode] = useState('')
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function apply(e: FormEvent) {
    e.preventDefault()
    const typed = code.trim()
    if (typed === '' || checking || locked) return
    setChecking(true)
    setError(null)
    try {
      await onApply(typed)
      setCode('')
    } catch (caught) {
      setError(apiErrorMessage(tCommon, caught))
    } finally {
      setChecking(false)
    }
  }

  if (voucher) {
    return (
      <div className="grid gap-2">
        <div className="flex min-h-11 items-center justify-between gap-2 rounded-tile border border-primary bg-primary-container py-1 pr-1 pl-3">
          <span className="flex min-w-0 items-center gap-2 text-primary-strong">
            <TicketPercentIcon aria-hidden="true" className="size-5 shrink-0" />
            <span className="grid min-w-0">
              <span className="text-title-md">{voucher.code}</span>
              {voucher.name && <span className="truncate text-label-sm text-on-primary-container">{voucher.name}</span>}
            </span>
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-11 shrink-0 text-primary-strong"
            disabled={locked}
            aria-label={t('voucher.remove', { code: voucher.code })}
            onClick={onRemove}
          >
            <XIcon aria-hidden="true" />
          </Button>
        </div>
        {!applies && voucher.min_spend !== null && (
          <p role="status" className="rounded-control bg-warning-container p-2 text-label-md text-on-warning-container">
            {t('voucher.minSpend', { amount: formatRupiah(voucher.min_spend, i18n.language) })}
          </p>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={(e) => void apply(e)} noValidate className="grid gap-2">
      <Label htmlFor={id} className="text-title-md">
        {t('voucher.label')}
      </Label>
      <div className="flex gap-2">
        <Input
          id={id}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={t('voucher.placeholder')}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          maxLength={64}
          disabled={locked}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="h-11 min-w-0 text-body-md uppercase placeholder:normal-case"
        />
        <Button type="submit" variant="outline" className="h-11 shrink-0" disabled={locked || checking || code.trim() === ''}>
          {checking ? t('voucher.checking') : t('voucher.apply')}
        </Button>
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-label-md text-error">
          {error}
        </p>
      )}
    </form>
  )
}
