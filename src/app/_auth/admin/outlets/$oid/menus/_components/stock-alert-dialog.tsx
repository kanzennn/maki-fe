import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { FormAlert } from '@/components/shared/form-message'
import { NumberField } from '@/components/shared/number-field'
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

import { useSetStockAlert } from '@/hooks/menu/menu.queries'
import { validationResolver } from '@/hooks/validation-resolver'
import type { Menu, StockAlertFormValues } from '@/modules/menu/types'
import { validateStockAlert } from '@/modules/menu/validations/stock.validation'

const alertValues = (menu: Menu): StockAlertFormValues => ({
  stock_alert: menu.stock_alert != null ? String(menu.stock_alert) : '',
})

/**
 * Sets the count at or below which a tracked menu's stock is low, for
 * whoever adjusts stock without editing the menu; the menu form has the
 * same field. Empty turns the alert off.
 */
export function StockAlertDialog({
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
  const setAlert = useSetStockAlert(outletId, menu.menu_id)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const form = useForm<StockAlertFormValues>({
    resolver: validationResolver(validateStockAlert),
    defaultValues: alertValues(menu),
  })
  const { errors, isSubmitting } = form.formState

  async function submit(values: StockAlertFormValues) {
    setError(null)
    try {
      await setAlert.mutateAsync(values)
      setOpen(false)
      onDone(t('alert.done', { name: menu.name }))
    } catch (caught) {
      if (!placeFieldErrors(caught, ['stock_alert'], form.setError)) setError(apiErrorMessage(tCommon, caught))
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        setError(null)
        form.reset(alertValues(menu))
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="h-11">
          {t('alert.action')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={form.handleSubmit(submit)} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{t('alert.title', { name: menu.name })}</DialogTitle>
            <DialogDescription>
              {menu.stock_alert
                ? t('stock.alertAt', { stock: formatNumber(menu.stock_alert, i18n.language) })
                : t('stock.alertOff')}
            </DialogDescription>
          </DialogHeader>
          {error && <FormAlert>{error}</FormAlert>}
          <Controller
            name="stock_alert"
            control={form.control}
            render={({ field }) => (
              <NumberField
                label={t('fields.stockAlert')}
                hint={t('form.alertHint')}
                maxDigits={7}
                error={fieldError(errors.stock_alert)}
                {...field}
              />
            )}
          />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" className="h-11">
                {tCommon('actions.cancel')}
              </Button>
            </DialogClose>
            <Button type="submit" className="h-11" disabled={isSubmitting}>
              {isSubmitting ? tCommon('actions.saving') : t('alert.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
