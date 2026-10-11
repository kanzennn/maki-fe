import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'

import { ApiError } from '@/shared/api/client'

/**
 * Puts a validation_failed answer on the form: its details.fields name the
 * rule each field broke ({ code: 'format' }), which the field then shows
 * translated. Returns true when every field named is one of fields, so
 * nothing is left to say; false otherwise, and for any other error, so the
 * caller shows the error above the form.
 */
export function placeFieldErrors<T extends FieldValues>(
  error: unknown,
  fields: readonly Path<T>[],
  setError: UseFormSetError<T>,
): boolean {
  if (!(error instanceof ApiError) || error.code !== 'validation_failed') return false
  const broken = error.details?.fields
  if (broken === null || typeof broken !== 'object') return false

  let all = true
  for (const [field, rule] of Object.entries(broken)) {
    const known = fields.find((f) => f === field)
    if (known && typeof rule === 'string') setError(known, { type: 'server', message: rule })
    else all = false
  }
  return all
}
