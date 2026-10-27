import type { FieldErrors, FieldValues, Resolver } from 'react-hook-form'

import { ValidationError } from '@/lib/validation'

/**
 * A react-hook-form resolver from a module's validation: each field the
 * validation names shows the rule it broke, all at once. The form submits
 * its values as typed; the usecase validates them again before it calls the
 * API, and sends what the validation returns.
 */
export function validationResolver<T extends FieldValues>(validate: (values: T) => unknown): Resolver<T> {
  return (values) => {
    try {
      validate(values)
      return { values, errors: {} }
    } catch (error) {
      if (!(error instanceof ValidationError)) throw error
      const errors: Record<string, unknown> = {}
      for (const [field, rule] of Object.entries(error.fields)) {
        place(errors, field.split('.'), { type: 'validate', message: rule })
      }
      return { values: {}, errors: errors as FieldErrors<T> }
    }
  }
}

/** Puts an error at a field's path, items.0.qty as { items: { 0: { qty } } }, the shape react-hook-form reads. */
function place(errors: Record<string, unknown>, path: string[], error: { type: string; message: string }) {
  const [head, ...rest] = path
  if (rest.length === 0) {
    errors[head] = error
    return
  }
  const next = (errors[head] ??= {}) as Record<string, unknown>
  place(next, rest, error)
}
