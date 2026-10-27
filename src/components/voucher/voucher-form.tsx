import { useQuery } from '@tanstack/react-query'
import { useId, useState } from 'react'
import { Controller, useForm, useWatch, type FieldError } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { ApiError } from '@/lib/http'
import { ChoiceTiles } from '@/components/shared/choice-tiles'
import { FormField } from '@/components/shared/form-field'
import { FormAlert } from '@/components/shared/form-message'
import { NumberField } from '@/components/shared/number-field'
import { useFieldError } from '@/hooks/use-field-error'
import { apiErrorMessage } from '@/lib/api-error-message'
import { placeFieldErrors } from '@/components/shared/form-errors'
import { Button } from '@/components/shared/button'
import { Checkbox } from '@/components/shared/checkbox'
import { Label } from '@/components/ui/label'

import { allOutletsQuery } from '@/hooks/outlet/outlet.queries'
import { validationResolver } from '@/hooks/validation-resolver'
import { voucherFields, type Voucher, type VoucherFormValues } from '@/modules/voucher/types'
import { validateVoucherForm } from '@/modules/voucher/validations/voucher.validation'

import { voucherFormValues } from './voucher-form-values'

/**
 * A voucher's fields, for a new voucher or a change to one. Once a sale has
 * used it, its code and type stay as they are, and the form says what else
 * can't go back. The server's answer to a field it rejects shows on that
 * field.
 */
export function VoucherForm({
  voucher,
  submitLabel,
  onSubmit,
}: {
  voucher?: Voucher
  submitLabel: string
  onSubmit: (values: VoucherFormValues) => Promise<unknown>
}) {
  const { t, i18n } = useTranslation('voucher')
  const { t: tCommon } = useTranslation()
  const fieldError = useFieldError()
  const activeId = useId()
  const [error, setError] = useState<string | null>(null)
  const used = Boolean(voucher?.first_used_at)
  const form = useForm<VoucherFormValues>({
    resolver: validationResolver(validateVoucherForm),
    defaultValues: voucherFormValues(i18n.language, voucher),
  })
  const { errors, isSubmitting } = form.formState
  const type = useWatch({ control: form.control, name: 'type' })
  const allOutlets = useWatch({ control: form.control, name: 'all_outlets' })
  const outlets = useQuery(allOutletsQuery())
  // The list's own error, not one of its items': the schema and the server name the list.
  const outletsError = errors.outlet_ids as FieldError | undefined

  async function submit(values: VoucherFormValues) {
    setError(null)
    try {
      await onSubmit(values)
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === 'voucher_code_taken') {
        form.setError('code', { type: 'api', message: apiErrorMessage(tCommon, caught) }, { shouldFocus: true })
      } else if (!placeFieldErrors(caught, voucherFields, form.setError)) {
        setError(apiErrorMessage(tCommon, caught))
      }
    }
  }

  return (
    <form onSubmit={form.handleSubmit(submit)} noValidate className="grid max-w-2xl gap-6">
      {error && <FormAlert>{error}</FormAlert>}
      {used && (
        <p className="rounded-control bg-surface-container p-3 text-body-md text-on-surface-variant">
          {t('form.usedNotice')}
        </p>
      )}

      <fieldset className="grid gap-4">
        <legend className="mb-4 text-title-md text-on-surface">{t('form.identity')}</legend>
        <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
          <FormField
            label={t('fields.code')}
            hint={t('form.codeHint')}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            // Read-only rather than disabled: the form still sends it.
            readOnly={used}
            className="uppercase read-only:cursor-not-allowed read-only:bg-surface-container read-only:text-on-surface-variant"
            error={fieldError(errors.code)}
            {...form.register('code')}
          />
          <FormField label={t('fields.name')} hint={t('form.nameHint')} error={fieldError(errors.name)} {...form.register('name')} />
        </div>
      </fieldset>

      <fieldset className="grid gap-4">
        <legend className="mb-4 text-title-md text-on-surface">{t('form.discount')}</legend>
        <Controller
          name="type"
          control={form.control}
          render={({ field }) => (
            <ChoiceTiles
              legend={t('fields.type')}
              value={field.value}
              disabled={used}
              onChange={(next) => {
                field.onChange(next)
                // A percentage and an amount aren't typed alike.
                form.setValue('value', '')
              }}
              choices={[
                { value: 'percent', label: t('type.percent'), hint: t('form.percentHint') },
                { value: 'amount', label: t('type.amount'), hint: t('form.amountHint') },
              ]}
            />
          )}
        />
        {errors.type && <p className="text-label-md text-error">{fieldError(errors.type)}</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          {type === 'percent' ? (
            <FormField
              label={t('fields.percent')}
              inputMode="decimal"
              autoComplete="off"
              hint={t('form.percentValueHint')}
              error={fieldError(errors.value)}
              {...form.register('value')}
            />
          ) : (
            <Controller
              name="value"
              control={form.control}
              render={({ field }) => (
                <NumberField label={t('fields.amount')} prefix="Rp" maxDigits={10} error={fieldError(errors.value)} {...field} />
              )}
            />
          )}
          {type === 'percent' && (
            <Controller
              name="max_discount"
              control={form.control}
              render={({ field }) => (
                <NumberField
                  label={t('fields.maxDiscount')}
                  prefix="Rp"
                  maxDigits={10}
                  hint={t('form.optional')}
                  error={fieldError(errors.max_discount)}
                  {...field}
                />
              )}
            />
          )}
          <Controller
            name="min_spend"
            control={form.control}
            render={({ field }) => (
              <NumberField
                label={t('fields.minSpend')}
                prefix="Rp"
                maxDigits={10}
                hint={t('form.optional')}
                error={fieldError(errors.min_spend)}
                {...field}
              />
            )}
          />
        </div>
      </fieldset>

      <fieldset className="grid gap-4">
        <legend className="mb-4 text-title-md text-on-surface">{t('form.usage')}</legend>
        <Controller
          name="quota"
          control={form.control}
          render={({ field }) => (
            <NumberField
              label={t('fields.quota')}
              maxDigits={7}
              hint={used ? t('form.quotaUsedHint') : t('form.quotaHint')}
              className="sm:max-w-xs"
              error={fieldError(errors.quota)}
              {...field}
            />
          )}
        />
        <p className="text-body-md text-on-surface-variant">{t('form.periodHint')}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label={t('fields.startAt')}
            type="datetime-local"
            hint={t('form.startHint')}
            error={fieldError(errors.start_at)}
            {...form.register('start_at')}
          />
          <FormField
            label={t('fields.expiredAt')}
            type="datetime-local"
            hint={used ? t('form.expiryUsedHint') : undefined}
            error={fieldError(errors.expired_at)}
            {...form.register('expired_at')}
          />
        </div>
      </fieldset>

      <fieldset className="grid gap-4">
        <legend className="mb-4 text-title-md text-on-surface">{t('form.outlets')}</legend>
        <Controller
          name="all_outlets"
          control={form.control}
          render={({ field }) => (
            <ChoiceTiles
              legend={t('fields.outlets')}
              value={field.value ? 'all' : 'some'}
              onChange={(next) => field.onChange(next === 'all')}
              choices={[
                { value: 'all', label: t('outlets.all'), hint: t('form.allOutletsHint') },
                { value: 'some', label: t('outlets.some'), hint: t('form.someOutletsHint') },
              ]}
            />
          )}
        />
        {!allOutlets && (
          <Controller
            name="outlet_ids"
            control={form.control}
            render={({ field }) => (
              <fieldset className="grid gap-2" aria-describedby={errors.outlet_ids ? `${activeId}-outlets` : undefined}>
                <legend className="sr-only">{t('form.pickOutlets')}</legend>
                {outlets.isPending && <p className="text-body-md text-on-surface-variant">{tCommon('list.loading')}</p>}
                {outlets.isError && <FormAlert>{apiErrorMessage(tCommon, outlets.error)}</FormAlert>}
                {outlets.data?.map((outlet) => {
                  const id = `${activeId}-${outlet.outlet_id}`
                  const checked = field.value.includes(outlet.outlet_id)
                  return (
                    <div key={outlet.outlet_id} className="flex min-h-11 items-center gap-3">
                      <Checkbox
                        id={id}
                        checked={checked}
                        onCheckedChange={(next) =>
                          field.onChange(
                            next === true
                              ? [...field.value, outlet.outlet_id]
                              : field.value.filter((v) => v !== outlet.outlet_id),
                          )
                        }
                      />
                      <Label htmlFor={id} className="text-body-md text-on-surface">
                        {outlet.name} <span className="text-on-surface-variant">({outlet.code})</span>
                      </Label>
                    </div>
                  )
                })}
                {errors.outlet_ids && (
                  <p id={`${activeId}-outlets`} className="text-label-md text-error">
                    {fieldError(outletsError)}
                  </p>
                )}
              </fieldset>
            )}
          />
        )}
      </fieldset>

      {!voucher && (
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
