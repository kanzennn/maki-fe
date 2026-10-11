import { zodResolver } from '@hookform/resolvers/zod'
import { ClipboardCheckIcon, MinusIcon, PlusIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { ChoiceTiles } from '@/shared/components/ChoiceTiles'
import { FormField } from '@/shared/components/FormField'
import { FormAlert } from '@/shared/components/FormMessage'
import { NumberField } from '@/shared/components/NumberField'
import { SelectField } from '@/shared/components/SelectField'
import { useFieldError } from '@/shared/hooks/useFieldError'
import { apiErrorMessage } from '@/shared/lib/api-error-message'
import { placeFieldErrors } from '@/shared/lib/form-errors'
import { formatNumber } from '@/shared/lib/number'
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

import { useAdjustStock, type Menu } from '../api'
import {
  adjustmentFields,
  adjustmentSchema,
  MAX_STOCK,
  stockAfter,
  toAdjustment,
  usualReason,
  type AdjustmentReason,
  type AdjustmentType,
  type AdjustmentValues,
} from '../schemas'

const reasons = ['restock', 'damaged', 'correction', 'other'] as const satisfies readonly AdjustmentReason[]

const blank: AdjustmentValues = { type: 'in', qty: '', reason: usualReason.in, note: '' }

/**
 * Adds to, takes from, or counts a tracked menu's stock (a stock take), with
 * a reason, and shows the count it will leave before it is saved. Taking
 * more than there is can't be sent; if the count changed meanwhile, the
 * server's refusal says what is there, and the dialog shows the new count.
 */
export function AdjustStockDialog({
  outletId,
  menu,
  onDone,
}: {
  outletId: string
  menu: Menu
  onDone: (notice: string) => void
}) {
  const { t, i18n } = useTranslation('menu')
  const { t: tCommon } = useTranslation()
  const fieldError = useFieldError()
  const adjust = useAdjustStock(outletId, menu.menu_id)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Until a reason is picked, it follows the type: restock for stock in, and so on.
  const [reasonPicked, setReasonPicked] = useState(false)
  const current = menu.stock_qty
  const resolver = useMemo(() => zodResolver(adjustmentSchema(current)), [current])
  const form = useForm<AdjustmentValues>({ resolver, defaultValues: blank })
  const { errors, isSubmitting } = form.formState
  const type = useWatch({ control: form.control, name: 'type' })
  const qty = useWatch({ control: form.control, name: 'qty' })
  const after = qty === '' ? null : stockAfter(current, type, Number(qty))
  const count = (value: number) => formatNumber(value, i18n.language)

  function pickType(next: AdjustmentType) {
    form.setValue('type', next)
    if (!reasonPicked) form.setValue('reason', usualReason[next])
  }

  async function submit(values: AdjustmentValues) {
    setError(null)
    try {
      const adjusted = await adjust.mutateAsync(toAdjustment(values))
      setOpen(false)
      onDone(t('adjust.done', { name: menu.name, stock: count(adjusted.stock_qty) }))
    } catch (caught) {
      if (!placeFieldErrors(caught, adjustmentFields, form.setError)) setError(apiErrorMessage(tCommon, caught))
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        setError(null)
        setReasonPicked(false)
        form.reset(blank)
      }}
    >
      <DialogTrigger asChild>
        <Button className="h-11">{t('adjust.action')}</Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={form.handleSubmit(submit)} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{t('adjust.title', { name: menu.name })}</DialogTitle>
            <DialogDescription>{t('adjust.current', { stock: count(current) })}</DialogDescription>
          </DialogHeader>
          {error && <FormAlert>{error}</FormAlert>}
          <ChoiceTiles
            legend={t('adjust.type')}
            value={type}
            onChange={pickType}
            choices={[
              { value: 'in', label: t('adjust.types.in'), hint: t('adjust.typeHints.in'), icon: PlusIcon },
              { value: 'out', label: t('adjust.types.out'), hint: t('adjust.typeHints.out'), icon: MinusIcon },
              { value: 'set', label: t('adjust.types.set'), hint: t('adjust.typeHints.set'), icon: ClipboardCheckIcon },
            ]}
          />
          <Controller
            name="qty"
            control={form.control}
            render={({ field }) => (
              <NumberField label={t(`adjust.qty.${type}`)} maxDigits={7} error={fieldError(errors.qty)} {...field} />
            )}
          />
          <p aria-live="polite" className="text-title-md text-on-surface">
            {after !== null && after >= 0 && after <= MAX_STOCK && t('adjust.after', { stock: count(after) })}
          </p>
          <SelectField
            label={t('adjust.reason')}
            error={fieldError(errors.reason)}
            {...form.register('reason', { onChange: () => setReasonPicked(true) })}
          >
            {reasons.map((reason) => (
              <option key={reason} value={reason}>
                {t(`adjust.reasons.${reason}`)}
              </option>
            ))}
          </SelectField>
          <FormField
            label={t('adjust.note')}
            hint={t('adjust.noteHint')}
            autoComplete="off"
            error={fieldError(errors.note)}
            {...form.register('note')}
          />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" className="h-11">
                {tCommon('actions.cancel')}
              </Button>
            </DialogClose>
            <Button type="submit" className="h-11" disabled={isSubmitting}>
              {isSubmitting ? tCommon('actions.saving') : t('adjust.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
