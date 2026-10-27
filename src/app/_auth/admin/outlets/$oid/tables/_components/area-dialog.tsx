import { useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { ApiError } from '@/lib/http'
import { FormField } from '@/components/shared/form-field'
import { FormAlert } from '@/components/shared/form-message'
import { useFieldError } from '@/hooks/use-field-error'
import { apiErrorMessage } from '@/lib/api-error-message'
import { placeFieldErrors } from '@/components/shared/form-errors'
import { Button } from '@/components/shared/button'
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/shared/dialog'

import { useCreateArea, useUpdateArea } from '@/hooks/table/table.queries'
import { validationResolver } from '@/hooks/validation-resolver'
import type { Area, AreaFormValues } from '@/modules/table/types'
import { validateAreaForm } from '@/modules/table/validations/table.validation'

/** A new area, which comes last in the order, or a new name for one. */
export function AreaDialog({
  outletId,
  area,
  trigger,
  onDone,
}: {
  outletId: string
  /** The area to rename; none for a new one. */
  area?: Area
  trigger: ReactNode
  onDone: (notice: string) => void
}) {
  const { t } = useTranslation('table')
  const { t: tCommon } = useTranslation()
  const fieldError = useFieldError()
  const create = useCreateArea(outletId)
  const update = useUpdateArea(outletId, area?.area_id ?? '')
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const form = useForm<AreaFormValues>({
    resolver: validationResolver(validateAreaForm),
    defaultValues: { name: area?.name ?? '' },
  })
  const { errors, isSubmitting } = form.formState

  async function submit(values: AreaFormValues) {
    setError(null)
    const name = values.name.trim()
    try {
      await (area ? update.mutateAsync(values) : create.mutateAsync(values))
      setOpen(false)
      onDone(area ? t('areas.form.saved', { name }) : t('areas.form.created', { name }))
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === 'area_name_taken') {
        form.setError('name', { type: 'api', message: apiErrorMessage(tCommon, caught) }, { shouldFocus: true })
      } else if (!placeFieldErrors(caught, ['name'], form.setError)) {
        setError(apiErrorMessage(tCommon, caught))
      }
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        setError(null)
        form.reset({ name: area?.name ?? '' })
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      {/* The field's hint says what it needs; there's nothing more to describe. */}
      <DialogContent aria-describedby={undefined}>
        <form onSubmit={form.handleSubmit(submit)} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{area ? t('areas.form.editTitle', { name: area.name }) : t('areas.form.createTitle')}</DialogTitle>
          </DialogHeader>
          {error && <FormAlert>{error}</FormAlert>}
          <FormField
            label={t('areas.fields.name')}
            hint={t('areas.form.nameHint')}
            autoComplete="off"
            error={fieldError(errors.name)}
            {...form.register('name')}
          />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" className="h-11">
                {tCommon('actions.cancel')}
              </Button>
            </DialogClose>
            <Button type="submit" className="h-11" disabled={isSubmitting}>
              {isSubmitting ? tCommon('actions.saving') : area ? t('areas.form.save') : t('areas.form.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
