import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { FormField } from '@/components/shared/form-field'
import { FormAlert, FormNotice } from '@/components/shared/form-message'
import { apiErrorMessage } from '@/lib/api-error-message'
import { Button } from '@/components/shared/button'

import { validationResolver } from '@/hooks/validation-resolver'
import type { ForgotPasswordValues } from '@/modules/auth/types'
import { requestPasswordReset } from '@/modules/auth/usecases/request-password-reset.usecase'
import { validateForgotPassword } from '@/modules/auth/validations/forgot-password.validation'
import { AuthShell } from '@/components/auth/auth-shell'
import { useFieldError } from '@/hooks/auth/use-auth-field-error'

export function ForgotPasswordPage() {
  const { t } = useTranslation('auth')
  const { t: tCommon } = useTranslation()
  const fieldError = useFieldError()
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const form = useForm<ForgotPasswordValues>({
    resolver: validationResolver(validateForgotPassword),
    defaultValues: { login: '' },
  })
  const { errors, isSubmitting } = form.formState

  async function onSubmit(values: ForgotPasswordValues) {
    setError(null)
    try {
      await requestPasswordReset(values)
      // The same answer whether or not the account exists (the server's rule).
      setSent(true)
    } catch (caught) {
      setError(apiErrorMessage(tCommon, caught))
    }
  }

  return (
    <AuthShell title={t('forgot.title')} intro={sent ? undefined : t('forgot.body')}>
      {sent ? (
        <FormNotice>{t('forgot.sent')}</FormNotice>
      ) : (
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid gap-4">
          {error && <FormAlert>{error}</FormAlert>}
          <FormField
            label={t('forgot.login')}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            error={fieldError(errors.login)}
            {...form.register('login')}
          />
          <Button type="submit" className="h-11 text-title-md" disabled={isSubmitting}>
            {t('forgot.submit')}
          </Button>
          <p className="text-label-md text-on-surface-variant">{t('forgot.note')}</p>
        </form>
      )}
      <Link to="/login" search={{}} className="justify-self-start text-body-md text-primary-strong underline-offset-4 hover:underline">
        {t('forgot.back')}
      </Link>
    </AuthShell>
  )
}
