import { ClipboardCheckIcon, MinusIcon, PlusIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { ChoiceTiles } from '@/components/shared/choice-tiles'
import { FormField } from '@/components/shared/form-field'
import { FormAlert } from '@/components/shared/form-message'
import { NumberField } from '@/components/shared/number-field'
import { SelectField } from '@/components/shared/select-field'
import { useFieldError } from '@/hooks/use-field-error'
import { apiErrorMessage } from '@/lib/api-error-message'
import { placeFieldErrors } from '@/components/shared/form-errors'
import { formatNumber } from '@/lib/number'
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

import { useAdjustStock } from '@/hooks/menu/menu.queries'
import { validationResolver } from '@/hooks/validation-resolver'
import {
  adjustmentFields,
  adjustmentReasons as reasons,
  MAX_STOCK,
  usualReason,
  type AdjustmentFormValues,
  type AdjustmentType,
  type Menu,
} from '@/modules/menu/types'
import { stockAfter } from '@/modules/menu/usecases/stock-after.usecase'
import { validateAdjustment } from '@/modules/menu/validations/stock.validation'

const blank: AdjustmentFormValues = { type: 'in', qty: '', reason: usualReason.in, note: '' }

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
  const adjust = useAdjustStock(outletId, menu)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Until a reason is picked, it follows the type: restock for stock in, and so on.
  const [reasonPicked, setReasonPicked] = useState(false)
  const current = menu.stock_qty
  const resolver = useMemo(
    () => validationResolver((values: AdjustmentFormValues) => validateAdjustment(values, current)),
    [current],
  )
  const form = useForm<AdjustmentFormValues>({ resolver, defaultValues: blank })
  const { errors, isSubmitting } = form.formState
  const type = useWatch({ control: form.control, name: 'type' })
  const qty = useWatch({ control: form.control, name: 'qty' })
  const after = qty === '' ? null : stockAfter(current, type, Number(qty))
  const count = (value: number) => formatNumber(value, i18n.language)

  function pickType(next: AdjustmentType) {
    form.setValue('type', next)
    if (!reasonPicked) form.setValue('reason', usualReason[next])
  }

  async function submit(values: AdjustmentFormValues) {
    setError(null)
    try {
      const adjusted = await adjust.mutateAsync(values)
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
