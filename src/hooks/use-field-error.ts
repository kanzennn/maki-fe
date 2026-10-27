import type { FieldError } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

/**
 * Translates a form field's error. Schemas and the server's validation_failed
 * answers name the rule a field broke ('required', 'format', …), shown from
 * common:validation; an error of type 'api' carries a message translated
 * already, such as "This username is taken".
 */
export function useFieldError() {
  const { t } = useTranslation()
  return (error?: FieldError): string | undefined => {
    if (!error?.message) return undefined
    if (error.type === 'api') return error.message
    // Rules are open-ended (the server may add one); defaultValue covers
    // one without a translation.
    return t(`validation.${error.message}` as 'validation.invalid', { defaultValue: t('validation.invalid') })
  }
}
