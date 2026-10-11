import { zodResolver } from '@hookform/resolvers/zod'
import { useId, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { ApiError } from '@/shared/api/client'
import { ChoiceTiles } from '@/shared/components/ChoiceTiles'
import { FormField } from '@/shared/components/FormField'
import { FormAlert } from '@/shared/components/FormMessage'
import { NumberField } from '@/shared/components/NumberField'
import { SelectField } from '@/shared/components/SelectField'
import { TextareaField } from '@/shared/components/TextareaField'
import { useFieldError } from '@/shared/hooks/useFieldError'
import { apiErrorMessage } from '@/shared/lib/api-error-message'
import { placeFieldErrors } from '@/shared/lib/form-errors'
import { formatNumber } from '@/shared/lib/number'
import { Button } from '@/shared/ui/button'
import { Checkbox } from '@/shared/ui/checkbox'
import { Label } from '@/shared/ui/label'

import type { Category, Menu, MenuInput } from '../api'
import { menuFields, menuSchema, menuValues, toMenuInput, type MenuValues } from '../schemas'

/**
 * A menu's fields, new or existing. Its stock mode says whether it has a
 * count: tracking that starts needs the count it starts from, and once
 * tracked the count only changes through stock adjustments, never here.
 */
export function MenuForm({
  menu,
  categories,
  submitLabel,
  onSubmit,
}: {
  menu?: Menu
  categories: Category[]
  submitLabel: string
  onSubmit: (input: MenuInput) => Promise<unknown>
}) {
  const { t, i18n } = useTranslation('menu')
  const { t: tCommon } = useTranslation()
  const fieldError = useFieldError()
  const activeId = useId()
  const [error, setError] = useState<string | null>(null)
  const wasTracked = menu?.track_stock ?? false
  const form = useForm<MenuValues>({ resolver: zodResolver(menuSchema(wasTracked)), defaultValues: menuValues(menu) })
  const { errors, isSubmitting } = form.formState
  const tracked = useWatch({ control: form.control, name: 'track_stock' })

  async function submit(values: MenuValues) {
    setError(null)
    try {
      await onSubmit(toMenuInput(values, menu))
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === 'menu_sku_taken') {
        form.setError('sku', { type: 'api', message: apiErrorMessage(tCommon, caught) }, { shouldFocus: true })
      } else if (!placeFieldErrors(caught, menuFields, form.setError)) {
        setError(apiErrorMessage(tCommon, caught))
      }
    }
  }

  return (
    <form onSubmit={form.handleSubmit(submit)} noValidate className="grid max-w-xl gap-4">
      {error && <FormAlert>{error}</FormAlert>}
      <FormField label={t('fields.name')} error={fieldError(errors.name)} {...form.register('name')} />
      <SelectField label={t('fields.category')} error={fieldError(errors.category_id)} {...form.register('category_id')}>
        <option value="" disabled>
          {t('form.chooseCategory')}
        </option>
        {categories.map((category) => {
          const name = category.icon ? `${category.icon} ${category.name}` : category.name
          return (
            <option key={category.category_id} value={category.category_id}>
              {category.is_active ? name : t('form.inactiveCategory', { name })}
            </option>
          )
        })}
      </SelectField>
      <Controller
        name="price"
        control={form.control}
        render={({ field }) => (
          <NumberField
            label={t('fields.price')}
            prefix="Rp"
            hint={t('form.priceHint')}
            error={fieldError(errors.price)}
            {...field}
          />
        )}
      />
      <FormField
        label={t('fields.sku')}
        hint={t('form.skuHint')}
        autoComplete="off"
        error={fieldError(errors.sku)}
        {...form.register('sku')}
      />
      <TextareaField
        label={t('fields.description')}
        hint={t('form.descriptionHint')}
        error={fieldError(errors.description)}
        {...form.register('description')}
      />

      <Controller
        name="track_stock"
        control={form.control}
        render={({ field }) => (
          <ChoiceTiles
            legend={t('fields.stockMode')}
            value={field.value ? 'tracked' : 'untracked'}
            onChange={(mode) => field.onChange(mode === 'tracked')}
            choices={[
              { value: 'untracked', label: t('form.untracked'), hint: t('form.untrackedHint') },
              { value: 'tracked', label: t('form.tracked'), hint: t('form.trackedHint') },
            ]}
          />
        )}
      />
      {wasTracked && !tracked && (
        <p className="rounded-control bg-surface-container p-3 text-body-md text-on-surface">{t('form.stopTracking')}</p>
      )}
      {tracked && wasTracked && menu && (
        <p className="rounded-control bg-surface-container p-3 text-body-md text-on-surface">
          {t('form.stockNow', { stock: formatNumber(menu.stock_qty, i18n.language) })}
        </p>
      )}
      {tracked && (
        <div className="grid content-start gap-4 sm:grid-cols-2">
          {!wasTracked && (
            <Controller
              name="initial_stock"
              control={form.control}
              render={({ field }) => (
                <NumberField
                  label={t('fields.initialStock')}
                  hint={t('form.initialStockHint')}
                  maxDigits={7}
                  error={fieldError(errors.initial_stock)}
                  {...field}
                />
              )}
            />
          )}
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
        </div>
      )}

      {!menu && (
        <Controller
          name="is_active"
          control={form.control}
          render={({ field }) => (
            <div className="flex min-h-11 items-start gap-3 py-1">
              <Checkbox
                id={activeId}
                className="mt-0.5"
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
                aria-describedby={`${activeId}-hint`}
              />
              <div className="grid gap-0.5">
                <Label htmlFor={activeId} className="text-body-md leading-5 text-on-surface">
                  {t('fields.active')}
                </Label>
                <p id={`${activeId}-hint`} className="text-label-md text-on-surface-variant">
                  {t('form.activeHint')}
                </p>
              </div>
            </div>
          )}
        />
      )}

      <Button type="submit" className="h-11 justify-self-start text-title-md" disabled={isSubmitting}>
        {isSubmitting ? tCommon('actions.saving') : submitLabel}
      </Button>
    </form>
  )
}
