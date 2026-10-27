import { CircleIcon, RectangleHorizontalIcon, SquareIcon } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { ApiError } from '@/lib/http'
import { ChoiceTiles } from '@/components/shared/choice-tiles'
import { FormField } from '@/components/shared/form-field'
import { FormAlert } from '@/components/shared/form-message'
import { NumberField } from '@/components/shared/number-field'
import { SelectField } from '@/components/shared/select-field'
import { useFieldError } from '@/hooks/use-field-error'
import { apiErrorMessage } from '@/lib/api-error-message'
import { placeFieldErrors } from '@/components/shared/form-errors'
import { Button } from '@/components/shared/button'
import { Checkbox } from '@/components/shared/checkbox'
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/shared/dialog'
import { Label } from '@/components/ui/label'

import { useCreateTable, useUpdateTable } from '@/hooks/table/table.queries'
import { validationResolver } from '@/hooks/validation-resolver'
import { tableFields, type Area, type Table, type TableFormValues } from '@/modules/table/types'
import { validateTableForm } from '@/modules/table/validations/table.validation'

import { tableFormValues } from './table-form-values'

const shapeIcons = { square: SquareIcon, round: CircleIcon, rectangle: RectangleHorizontalIcon } as const

/**
 * A new table, or a change to one: its name, area, seats and shape, and for
 * a new one whether the cashier may pick it. A new table isn't on its
 * area's layout until it is placed there.
 */
export function TableDialog({
  outletId,
  areas,
  table,
  areaId,
  trigger,
  onDone,
}: {
  outletId: string
  areas: Area[]
  /** The table to change; none for a new one. */
  table?: Table
  /** A new table's area, chosen already. */
  areaId?: string
  trigger: ReactNode
  onDone: (notice: string) => void
}) {
  const { t } = useTranslation('table')
  const { t: tCommon } = useTranslation()
  const fieldError = useFieldError()
  const activeId = useId()
  const create = useCreateTable(outletId)
  const update = useUpdateTable(outletId, table?.table_id ?? '')
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const defaults = () => tableFormValues(table, areaId ?? areas[0]?.area_id)
  const form = useForm<TableFormValues>({ resolver: validationResolver(validateTableForm), defaultValues: defaults() })
  const { errors, isSubmitting } = form.formState

  async function submit(values: TableFormValues) {
    setError(null)
    const name = values.name.trim()
    try {
      await (table ? update.mutateAsync(values) : create.mutateAsync(values))
      setOpen(false)
      onDone(table ? t('form.saved', { name }) : t('form.created', { name }))
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === 'table_name_taken') {
        form.setError('name', { type: 'api', message: apiErrorMessage(tCommon, caught) }, { shouldFocus: true })
      } else if (!placeFieldErrors(caught, tableFields, form.setError)) {
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
        form.reset(defaults())
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent aria-describedby={undefined}>
        <form onSubmit={form.handleSubmit(submit)} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{table ? t('form.editTitle', { name: table.name }) : t('form.createTitle')}</DialogTitle>
          </DialogHeader>
          {error && <FormAlert>{error}</FormAlert>}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label={t('fields.name')}
              hint={t('form.nameHint')}
              autoComplete="off"
              error={fieldError(errors.name)}
              {...form.register('name')}
            />
            <SelectField label={t('fields.area')} error={fieldError(errors.area_id)} {...form.register('area_id')}>
              {areas.map((area) => (
                <option key={area.area_id} value={area.area_id}>
                  {area.name}
                </option>
              ))}
            </SelectField>
          </div>
          {table?.box && <p className="text-label-md text-on-surface-variant">{t('form.moveHint')}</p>}
          <Controller
            name="capacity"
            control={form.control}
            render={({ field }) => (
              <NumberField
                label={t('fields.capacity')}
                hint={t('form.capacityHint')}
                maxDigits={2}
                error={fieldError(errors.capacity)}
                {...field}
              />
            )}
          />
          <Controller
            name="shape"
            control={form.control}
            render={({ field }) => (
              <ChoiceTiles
                legend={t('fields.shape')}
                value={field.value}
                onChange={field.onChange}
                choices={(['square', 'round', 'rectangle'] as const).map((shape) => ({
                  value: shape,
                  label: t(`shape.${shape}`),
                  icon: shapeIcons[shape],
                }))}
              />
            )}
          />
          {!table && (
            <Controller
              name="is_active"
              control={form.control}
              render={({ field }) => (
                <div className="flex min-h-11 items-center gap-3">
                  <Checkbox id={activeId} checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} />
                  <Label htmlFor={activeId} className="text-body-md">
                    {t('form.active')}
                  </Label>
                </div>
              )}
            />
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" className="h-11">
                {tCommon('actions.cancel')}
              </Button>
            </DialogClose>
            <Button type="submit" className="h-11" disabled={isSubmitting}>
              {isSubmitting ? tCommon('actions.saving') : table ? t('form.save') : t('form.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
