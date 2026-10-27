import type { TFunction } from 'i18next'

import { ApiError } from '@/lib/http'

/**
 * The message to show for a failed call: the translation of the error's
 * `code`, falling back to the server's own `message` for a code the app has
 * no translation for yet, and a network message when the request never got
 * an answer. The error's details fill the translation (`{{min}}`), and a
 * rate limit's wait is given in whole minutes as `{{count}}`.
 */
export function apiErrorMessage(t: TFunction, error: unknown): string {
  if (!(error instanceof ApiError) || error.status === 0) return t('apiError.network')
  const values: Record<string, unknown> = { ...error.details }
  if (typeof error.details?.retry_after === 'number') {
    values.count = Math.max(1, Math.ceil(error.details.retry_after / 60))
  }
  // Codes are open-ended, so the key can't be checked at compile time;
  // defaultValue covers the ones without a translation.
  return t(`apiError.${error.code}` as 'apiError.internal_error', { ...values, defaultValue: error.message })
}
