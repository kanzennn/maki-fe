import { Link, useRouter, useSearch } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { FormField } from '@/components/shared/form-field'
import { FormAlert } from '@/components/shared/form-message'
import { apiErrorMessage } from '@/lib/api-error-message'
import { Button } from '@/components/shared/button'

import { validationResolver } from '@/hooks/validation-resolver'
import type { LoginValues } from '@/modules/auth/types'
import { safeRedirect } from '@/modules/auth/usecases/safe-redirect.usecase'
import { signIn } from '@/modules/auth/usecases/sign-in.usecase'
import { validateLogin } from '@/modules/auth/validations/login.validation'
import { AuthShell } from '@/components/auth/auth-shell'
import { useFieldError } from '@/hooks/auth/use-auth-field-error'

export function LoginPage() {
  const { t } = useTranslation('auth')
  const { t: tCommon } = useTranslation()
  const fieldError = useFieldError()
  const router = useRouter()
  const { redirect } = useSearch({ from: '/login' })
  const [error, setError] = useState<string | null>(null)
  const form = useForm<LoginValues>({
    resolver: validationResolver(validateLogin),
    defaultValues: { username: '', password: '' },
  })
  const { errors, isSubmitting } = form.formState

  async function onSubmit(values: LoginValues) {
    setError(null)
    try {
      const user = await signIn(values)
      // A password someone else chose must be replaced before anything else.
      await router.navigate({ href: user.must_change_password ? '/change-password' : safeRedirect(redirect) })
    } catch (caught) {
      setError(apiErrorMessage(tCommon, caught))
      form.resetField('password')
      form.setFocus('password')
    }
  }

  return (
    <AuthShell title={t('title')} intro={t('subtitle')}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid gap-4">
        {error && <FormAlert>{error}</FormAlert>}
        <FormField
          label={t('username')}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          error={fieldError(errors.username)}
          {...form.register('username')}
        />
        <FormField
          label={t('password')}
          type="password"
          autoComplete="current-password"
          error={fieldError(errors.password)}
          {...form.register('password')}
        />
        <Button type="submit" className="h-11 text-title-md" disabled={isSubmitting}>
          {isSubmitting ? t('submitting') : t('submit')}
        </Button>
        <Link to="/forgot-password" className="justify-self-start text-body-md text-primary-strong underline-offset-4 hover:underline">
          {t('forgotLink')}
        </Link>
      </form>
    </AuthShell>
  )
}
