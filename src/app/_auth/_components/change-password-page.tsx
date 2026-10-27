import { useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { FormField } from '@/components/shared/form-field'
import { FormAlert, FormNotice } from '@/components/shared/form-message'
import { PageHeading } from '@/components/shared/page-heading'
import { apiErrorMessage } from '@/lib/api-error-message'
import { useSession } from '@/hooks/use-session'
import { Button } from '@/components/shared/button'

import { validationResolver } from '@/hooks/validation-resolver'
import type { ChangePasswordValues } from '@/modules/auth/types'
import { changePassword } from '@/modules/auth/usecases/change-password.usecase'
import { validateChangePassword } from '@/modules/auth/validations/password.validation'
import { useFieldError } from '@/hooks/auth/use-auth-field-error'

/**
 * Changes the signed-in user's password. A user whose password someone else
 * set lands here first and can't go anywhere else until they choose their
 * own; the server refuses their other requests too.
 */
export function ChangePasswordPage() {
  const { t } = useTranslation('auth')
  const { t: tCommon } = useTranslation()
  const fieldError = useFieldError()
  const router = useRouter()
  const required = useSession((s) => s.user?.must_change_password ?? false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const form = useForm<ChangePasswordValues>({
    resolver: validationResolver(validateChangePassword),
    defaultValues: { current: '', password: '', confirm: '' },
  })
  const { errors, isSubmitting } = form.formState

  async function onSubmit(values: ChangePasswordValues) {
    setError(null)
    try {
      await changePassword(values)
      form.reset()
      setDone(true)
    } catch (caught) {
      setError(apiErrorMessage(tCommon, caught))
    }
  }

  return (
    <main className="grid gap-4 bg-background p-6">
      <div className="grid max-w-sm gap-4">
        <PageHeading>{t('change.title')}</PageHeading>
        {required && !done && <FormNotice>{t('change.required')}</FormNotice>}
        {done ? (
          <>
            <FormNotice>{t('change.done')}</FormNotice>
            <Button type="button" className="h-11 justify-self-start" onClick={() => void router.navigate({ to: '/admin' })}>
              {t('change.continue')}
            </Button>
          </>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid gap-4">
            {error && <FormAlert>{error}</FormAlert>}
            <FormField
              label={t('change.current')}
              type="password"
              autoComplete="current-password"
              error={fieldError(errors.current)}
              {...form.register('current')}
            />
            <FormField
              label={t('change.password')}
              type="password"
              autoComplete="new-password"
              hint={t('validation.min')}
              error={fieldError(errors.password)}
              {...form.register('password')}
            />
            <FormField
              label={t('change.confirm')}
              type="password"
              autoComplete="new-password"
              error={fieldError(errors.confirm)}
              {...form.register('confirm')}
            />
            <Button type="submit" className="h-11 text-title-md" disabled={isSubmitting}>
              {t('change.submit')}
            </Button>
          </form>
        )}
      </div>
    </main>
  )
}
