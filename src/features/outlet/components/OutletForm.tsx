import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { ApiError } from '@/shared/api/client'
import { FormField } from '@/shared/components/FormField'
import { FormAlert } from '@/shared/components/FormMessage'
import { SelectField } from '@/shared/components/SelectField'
import { useFieldError } from '@/shared/hooks/useFieldError'
import { apiErrorMessage } from '@/shared/lib/api-error-message'
import { placeFieldErrors } from '@/shared/lib/form-errors'
import { Button } from '@/shared/ui/button'

import type { Outlet, OutletInput } from '../api'
import { outletFields, outletSchema, outletValues, toOutletInput, type OutletValues } from '../schemas'

/** Indonesia's three zones first; every other IANA zone after them. */
const indonesianZones = ['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura'] as const
const otherZones = Intl.supportedValuesOf('timeZone').filter((zone) => !indonesianZones.some((z) => z === zone))

/**
 * An outlet's fields, for a new outlet or a change to one. The server's
 * answer to a field it rejects shows on that field.
 */
export function OutletForm({
  outlet,
  submitLabel,
  onSubmit,
}: {
  outlet?: Outlet
  submitLabel: string
  onSubmit: (input: OutletInput) => Promise<unknown>
}) {
  const { t, i18n } = useTranslation('outlet')
  const { t: tCommon } = useTranslation()
  const fieldError = useFieldError()
  const [error, setError] = useState<string | null>(null)
  const form = useForm<OutletValues>({
    resolver: zodResolver(outletSchema),
    defaultValues: outletValues(i18n.language, outlet),
  })
  const { errors, isSubmitting } = form.formState
  const timezone = useWatch({ control: form.control, name: 'timezone' })

  async function submit(values: OutletValues) {
    setError(null)
    try {
      await onSubmit(toOutletInput(values))
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === 'outlet_code_taken') {
        form.setError('code', { type: 'api', message: apiErrorMessage(tCommon, caught) }, { shouldFocus: true })
      } else if (!placeFieldErrors(caught, outletFields, form.setError)) {
        setError(apiErrorMessage(tCommon, caught))
      }
    }
  }

  return (
    <form onSubmit={form.handleSubmit(submit)} noValidate className="grid max-w-2xl gap-6">
      {error && <FormAlert>{error}</FormAlert>}

      <fieldset className="grid gap-4">
        <legend className="mb-4 text-title-md text-on-surface">{t('form.identity')}</legend>
        <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
          <FormField label={t('fields.name')} error={fieldError(errors.name)} {...form.register('name')} />
          <FormField
            label={t('fields.code')}
            hint={t('form.codeHint')}
            autoCapitalize="characters"
            spellCheck={false}
            className="uppercase"
            error={fieldError(errors.code)}
            {...form.register('code')}
          />
        </div>
        <FormField label={t('fields.address')} error={fieldError(errors.address)} {...form.register('address')} />
        <FormField
          label={t('fields.phone')}
          type="tel"
          autoComplete="off"
          className="sm:max-w-xs"
          error={fieldError(errors.phone)}
          {...form.register('phone')}
        />
      </fieldset>

      <fieldset className="grid gap-4">
        <legend className="mb-4 text-title-md text-on-surface">{t('form.hours')}</legend>
        <p className="-mt-2 text-body-md text-on-surface-variant">{t('form.hoursHint')}</p>
        <div className="grid gap-4 sm:grid-cols-2 sm:max-w-md">
          <FormField label={t('fields.openTime')} type="time" error={fieldError(errors.open_time)} {...form.register('open_time')} />
          <FormField label={t('fields.closeTime')} type="time" error={fieldError(errors.close_time)} {...form.register('close_time')} />
        </div>
      </fieldset>

      <fieldset className="grid gap-4">
        <legend className="mb-4 text-title-md text-on-surface">{t('form.charges')}</legend>
        <div className="grid gap-4 sm:grid-cols-2 sm:max-w-md">
          <FormField
            label={t('fields.taxPct')}
            inputMode="decimal"
            hint={t('form.percentHint')}
            error={fieldError(errors.tax_pct)}
            {...form.register('tax_pct')}
          />
          <FormField
            label={t('fields.servicePct')}
            inputMode="decimal"
            hint={t('form.percentHint')}
            error={fieldError(errors.service_pct)}
            {...form.register('service_pct')}
          />
        </div>
      </fieldset>

      <fieldset className="grid gap-4">
        <legend className="mb-4 text-title-md text-on-surface">{t('form.region')}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField label={t('fields.timezone')} error={fieldError(errors.timezone)} {...form.register('timezone')}>
            {![...indonesianZones, ...otherZones].includes(timezone) && timezone && (
              <option value={timezone}>{timezone}</option>
            )}
            <optgroup label={t('timezones.indonesia')}>
              {indonesianZones.map((zone) => (
                <option key={zone} value={zone}>
                  {t(`timezones.${zone}`)}
                </option>
              ))}
            </optgroup>
            <optgroup label={t('timezones.other')}>
              {otherZones.map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </optgroup>
          </SelectField>
          <SelectField
            label={t('fields.locale')}
            hint={t('form.localeHint')}
            error={fieldError(errors.locale)}
            {...form.register('locale')}
          >
            <option value="id">{t('locales.id')}</option>
            <option value="en">{t('locales.en')}</option>
          </SelectField>
        </div>
      </fieldset>

      <Button type="submit" className="h-11 justify-self-start text-title-md" disabled={isSubmitting}>
        {isSubmitting ? tCommon('actions.saving') : submitLabel}
      </Button>
    </form>
  )
}
