import { useSuspenseQuery } from '@tanstack/react-query'
import { useRouteContext } from '@tanstack/react-router'
import { useId, useState } from 'react'
import { Controller, useForm, type FieldError } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { ApiError } from '@/lib/http'
import { FormField } from '@/components/shared/form-field'
import { FormAlert } from '@/components/shared/form-message'
import { useFieldError } from '@/hooks/use-field-error'
import { apiErrorMessage } from '@/lib/api-error-message'
import { placeFieldErrors } from '@/components/shared/form-errors'
import { formatDateTimeRange, zoneName } from '@/lib/time'
import { Button } from '@/components/shared/button'
import { Checkbox } from '@/components/shared/checkbox'
import { Label } from '@/components/ui/label'

import { allAreasQuery, allTablesQuery } from '@/hooks/table/table.queries'
import { validationResolver } from '@/hooks/validation-resolver'
import { scheduleFields, type Schedule, type ScheduleFormValues, type ScheduleSubmission } from '@/modules/table/types'
import { validateScheduleForm } from '@/modules/table/validations/table.validation'

import { scheduleFormValues } from './schedule-form-values'

/** Another schedule that has some of the same tables out at the same time, as the 409 names it. */
type Overlap = { schedule_id: string; title: string; start_at: string; end_at: string; tables: string[] }

function overlapsOf(details: Record<string, unknown> | undefined): Overlap[] {
  const list = details?.schedules
  return Array.isArray(list) ? (list as Overlap[]) : []
}

/**
 * A schedule's fields, for a new one or a change to one: its title, its
 * times in the outlet's zone, and its tables, a few or a whole area at
 * once. A schedule that overlaps another at the same tables is a warning,
 * not a refusal: the form names the others, and saves anyway if asked.
 */
export function ScheduleForm({
  outletId,
  schedule,
  submitLabel,
  onSubmit,
}: {
  outletId: string
  schedule?: Schedule
  submitLabel: string
  onSubmit: (submission: ScheduleSubmission) => Promise<unknown>
}) {
  const { t, i18n } = useTranslation('table')
  const { t: tCommon } = useTranslation()
  const fieldError = useFieldError()
  const id = useId()
  const timeZone = useRouteContext({ from: '/_auth/admin/outlets/$oid', select: (c) => c.outlet.timezone })
  const { data: areas } = useSuspenseQuery(allAreasQuery(outletId))
  const { data: tables } = useSuspenseQuery(allTablesQuery(outletId))
  const [error, setError] = useState<string | null>(null)
  const [overlaps, setOverlaps] = useState<Overlap[] | null>(null)
  const form = useForm<ScheduleFormValues>({
    resolver: validationResolver((values: ScheduleFormValues) => validateScheduleForm(values, timeZone)),
    defaultValues: scheduleFormValues(timeZone, schedule),
  })
  const { errors, isSubmitting } = form.formState
  const locale = i18n.language
  const zone = zoneName(timeZone, locale)
  const groups = areas
    .map((area) => ({ area, tables: tables.filter((table) => table.area.area_id === area.area_id) }))
    .filter((group) => group.tables.length > 0)
  // The list's own error, not one of its items': the schema and the server name the list.
  const tablesError = errors.table_ids as FieldError | undefined
  // The server takes a start from the current minute on.
  const startError = errors.start_at?.message === 'future' ? t('schedules.form.startPast') : fieldError(errors.start_at)

  async function send(values: ScheduleFormValues, confirmOverlap: boolean) {
    setError(null)
    try {
      await onSubmit({ values, timeZone, confirmOverlap })
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === 'schedule_overlaps') {
        setOverlaps(overlapsOf(caught.details))
      } else if (!placeFieldErrors(caught, scheduleFields, form.setError)) {
        setError(apiErrorMessage(tCommon, caught))
      }
    }
  }

  const submit = form.handleSubmit((values) => {
    setOverlaps(null)
    return send(values, false)
  })
  const saveAnyway = form.handleSubmit((values) => send(values, true))

  return (
    <form onSubmit={submit} noValidate className="grid max-w-3xl gap-6">
      {error && <FormAlert>{error}</FormAlert>}
      {schedule?.status === 'ongoing' && (
        <p className="rounded-control bg-surface-container p-3 text-body-md text-on-surface-variant">
          {t('schedules.form.ongoing')}
        </p>
      )}

      <FormField
        label={t('schedules.fields.title')}
        hint={t('schedules.form.titleHint')}
        autoComplete="off"
        error={fieldError(errors.title)}
        {...form.register('title')}
      />

      <fieldset className="grid gap-4">
        <legend className="mb-2 text-title-md text-on-surface">{t('schedules.form.when')}</legend>
        <p className="text-body-md text-on-surface-variant">
          {t('schedules.form.zone', { zone, timeZone })}
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label={t('schedules.form.start', { zone })}
            type="datetime-local"
            error={startError}
            {...form.register('start_at')}
          />
          <FormField
            label={t('schedules.form.end', { zone })}
            type="datetime-local"
            error={fieldError(errors.end_at)}
            {...form.register('end_at')}
          />
        </div>
      </fieldset>

      <Controller
        name="table_ids"
        control={form.control}
        render={({ field }) => {
          const picked = new Set(field.value)
          const toggle = (ids: string[], on: boolean) =>
            field.onChange(on ? [...new Set([...field.value, ...ids])] : field.value.filter((v) => !ids.includes(v)))
          return (
            <fieldset className="grid gap-3" aria-describedby={tablesError ? `${id}-tables-error` : undefined}>
              <legend className="mb-2 text-title-md text-on-surface">{t('schedules.fields.tables')}</legend>
              {groups.length === 0 ? (
                <p className="text-body-md text-on-surface-variant">{t('schedules.form.noTables')}</p>
              ) : (
                <p className="text-body-md text-on-surface-variant">{t('schedules.form.tablesHint')}</p>
              )}
              {groups.map(({ area, tables: inArea }) => {
                const ids = inArea.map((table) => table.table_id)
                const count = ids.filter((v) => picked.has(v)).length
                const all = count === ids.length
                const areaBox = `${id}-${area.area_id}`
                return (
                  <div key={area.area_id} className="grid gap-1 rounded-card border border-outline p-3">
                    <div className="flex min-h-11 flex-wrap items-center gap-3">
                      <Checkbox
                        id={areaBox}
                        checked={all ? true : count > 0 ? 'indeterminate' : false}
                        onCheckedChange={() => toggle(ids, !all)}
                      />
                      <Label htmlFor={areaBox} className="text-title-md text-on-surface">
                        {t('schedules.form.wholeArea', { area: area.name })}
                      </Label>
                      <span className="text-label-md text-on-surface-variant">
                        {t('schedules.form.picked', { picked: count, total: ids.length })}
                      </span>
                    </div>
                    <ul className="grid grid-cols-2 gap-x-4 pl-8 sm:grid-cols-3 expanded:grid-cols-4">
                      {inArea.map((table) => {
                        const box = `${id}-${table.table_id}`
                        return (
                          <li key={table.table_id} className="flex min-h-11 items-center gap-3">
                            <Checkbox
                              id={box}
                              checked={picked.has(table.table_id)}
                              onCheckedChange={(next) => toggle([table.table_id], next === true)}
                            />
                            <Label htmlFor={box} className="text-body-md text-on-surface">
                              {table.name}
                            </Label>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )
              })}
              {tablesError && (
                <p id={`${id}-tables-error`} className="text-label-md text-error">
                  {fieldError(tablesError)}
                </p>
              )}
            </fieldset>
          )
        }}
      />

      {overlaps && (
        <div role="alert" className="grid gap-3 rounded-control bg-warning-container p-3 text-body-md text-on-warning-container">
          <p className="text-title-md">{t('schedules.overlap.title')}</p>
          <ul className="grid list-disc gap-1 pl-5">
            {overlaps.map((other) => (
              <li key={other.schedule_id}>
                {t('schedules.overlap.item', {
                  title: other.title,
                  period: formatDateTimeRange(other.start_at, other.end_at, locale, timeZone),
                  tables: other.tables.join(', '),
                })}
              </li>
            ))}
          </ul>
          <p>{t('schedules.overlap.body')}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" className="h-11" disabled={isSubmitting} onClick={() => void saveAnyway()}>
              {t('schedules.overlap.confirm')}
            </Button>
            <Button type="button" variant="outline" className="h-11" onClick={() => setOverlaps(null)}>
              {t('schedules.overlap.review')}
            </Button>
          </div>
        </div>
      )}

      {!overlaps && (
        <Button type="submit" className="h-11 justify-self-start text-title-md" disabled={isSubmitting}>
          {isSubmitting ? tCommon('actions.saving') : submitLabel}
        </Button>
      )}
    </form>
  )
}
