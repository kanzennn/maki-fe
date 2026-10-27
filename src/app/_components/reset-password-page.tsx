import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { ApiError } from '@/lib/http'
import { FormField } from '@/components/shared/form-field'
import { FormAlert, FormNotice } from '@/components/shared/form-message'
import { apiErrorMessage } from '@/lib/api-error-message'
import { Button } from '@/components/shared/button'

import { validationResolver } from '@/hooks/validation-resolver'
import type { NewPasswordValues } from '@/modules/auth/types'
import { resetPassword } from '@/modules/auth/usecases/reset-password.usecase'
import { validateNewPassword } from '@/modules/auth/validations/password.validation'
import { AuthShell } from '@/components/auth/auth-shell'
import { useFieldError } from '@/hooks/auth/use-auth-field-error'
import { useLinkToken } from '@/hooks/auth/use-link-token'

const linkClass = 'justify-self-start text-body-md text-primary-strong underline-offset-4 hover:underline'

export function ResetPasswordPage() {
  const { t } = useTranslation('auth')
  const { t: tCommon } = useTranslation()
  const fieldError = useFieldError()
  const token = useLinkToken()
  const [done, setDone] = useState(false)
  const [error, setError] = useState<{ message: string; deadLink: boolean } | null>(null)
  const form = useForm<NewPasswordValues>({
    resolver: validationResolver(validateNewPassword),
    defaultValues: { password: '', confirm: '' },
  })
  const { errors, isSubmitting } = form.formState

  async function onSubmit(values: NewPasswordValues) {
    if (!token) return
    setError(null)
    try {
      await resetPassword(token, values)
      setDone(true)
    } catch (caught) {
      const deadLink = caught instanceof ApiError && caught.code === 'token_invalid'
      setError({ message: apiErrorMessage(tCommon, caught), deadLink })
    }
  }

  if (!token) {
    return (
      <AuthShell title={t('reset.title')}>
        <FormAlert>{t('reset.noToken')}</FormAlert>
        <Link to="/forgot-password" className={linkClass}>
          {t('reset.requestNew')}
        </Link>
      </AuthShell>
    )
  }

  if (done) {
    return (
      <AuthShell title={t('reset.title')}>
        <FormNotice>{t('reset.done')}</FormNotice>
        <Link to="/login" search={{}} className={linkClass}>
          {t('reset.login')}
        </Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell title={t('reset.title')}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid gap-4">
        {error && <FormAlert>{error.message}</FormAlert>}
        {error?.deadLink && (
          <Link to="/forgot-password" className={linkClass}>
            {t('reset.requestNew')}
          </Link>
        )}
        <FormField
          label={t('reset.password')}
          type="password"
          autoComplete="new-password"
          hint={t('reset.hint')}
          error={fieldError(errors.password)}
          {...form.register('password')}
        />
        <FormField
          label={t('reset.confirm')}
          type="password"
          autoComplete="new-password"
          error={fieldError(errors.confirm)}
          {...form.register('confirm')}
        />
        <Button type="submit" className="h-11 text-title-md" disabled={isSubmitting}>
          {t('reset.submit')}
        </Button>
      </form>
    </AuthShell>
  )
}
