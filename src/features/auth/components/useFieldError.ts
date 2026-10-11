import type { FieldError } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

type Rule = 'required' | 'min' | 'max' | 'mismatch'

/** Translates a field's validation error: schemas use auth:validation keys as messages. */
export function useFieldError() {
  const { t } = useTranslation('auth')
  return (error?: FieldError) => (error?.message ? t(`validation.${error.message as Rule}`) : undefined)
}
