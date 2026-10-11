import { zodResolver } from '@hookform/resolvers/zod'
import { CircleIcon, RectangleHorizontalIcon, SquareIcon } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { ApiError } from '@/shared/api/client'
import { ChoiceTiles } from '@/shared/components/ChoiceTiles'
import { FormField } from '@/shared/components/FormField'
import { FormAlert } from '@/shared/components/FormMessage'
import { NumberField } from '@/shared/components/NumberField'
import { SelectField } from '@/shared/components/SelectField'
import { useFieldError } from '@/shared/hooks/useFieldError'
import { apiErrorMessage } from '@/shared/lib/api-error-message'
import { placeFieldErrors } from '@/shared/lib/form-errors'
import { Button } from '@/shared/ui/button'
import { Checkbox } from '@/shared/ui/checkbox'
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/ui/dialog'
import { Label } from '@/shared/ui/label'

import { useCreateTable, useUpdateTable, type Area, type Table } from '../api'
import { tableFields, tableSchema, tableValues, toTableInput, type TableValues } from '../schemas'

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
  const defaults = () => tableValues(table, areaId ?? areas[0]?.area_id)
  const form = useForm<TableValues>({ resolver: zodResolver(tableSchema), defaultValues: defaults() })
  const { errors, isSubmitting } = form.formState

  async function submit(values: TableValues) {
    setError(null)
    const input = toTableInput(values)
    try {
      await (table ? update.mutateAsync(input) : create.mutateAsync(input))
      setOpen(false)
      onDone(table ? t('form.saved', { name: input.name }) : t('form.created', { name: input.name }))
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
