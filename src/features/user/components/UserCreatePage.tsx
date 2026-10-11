import { zodResolver } from '@hookform/resolvers/zod'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { ApiError } from '@/shared/api/client'
import { allRolesQuery } from '@/shared/api/roles'
import { FormField } from '@/shared/components/FormField'
import { FormAlert } from '@/shared/components/FormMessage'
import { BackLink, PageHeader } from '@/shared/components/PageHeader'
import { SelectField } from '@/shared/components/SelectField'
import { useFieldError } from '@/shared/hooks/useFieldError'
import { apiErrorMessage } from '@/shared/lib/api-error-message'
import { placeFieldErrors } from '@/shared/lib/form-errors'
import { useSession } from '@/shared/lib/session'
import { Button } from '@/shared/ui/button'

import { useCreateStaff } from '../api'
import { grantableRoles } from '../manage'
import { createStaffFields, createStaffSchema, orNull, type CreateStaffValues } from '../schemas'

const passwordErrors = ['password_too_short', 'password_too_long', 'password_same_as_username']

/**
 * A new account with a temporary password, which its user replaces at the
 * first sign-in. The Owner creates Managers; everyone else creates staff,
 * with a role that holds nothing they lack.
 */
export function UserCreatePage() {
  const { t } = useTranslation('user')
  const { t: tCommon } = useTranslation()
  const fieldError = useFieldError()
  const { oid } = useParams({ from: '/_auth/admin/outlets/$oid/users/new' })
  const navigate = useNavigate()
  const actor = useSession((s) => s.user)
  const manager = actor?.is_owner ?? false
  const { data: roles } = useSuspenseQuery(allRolesQuery(oid))
  const choices = grantableRoles(actor, roles)
  const create = useCreateStaff(oid)
  const [error, setError] = useState<string | null>(null)
  const form = useForm<CreateStaffValues>({
    resolver: zodResolver(createStaffSchema),
    defaultValues: {
      name: '',
      username: '',
      email: '',
      phone: '',
      role_id: '',
      password: '',
      confirm: '',
      is_manager: manager,
    },
  })
  const { errors, isSubmitting } = form.formState

  async function submit(values: CreateStaffValues) {
    setError(null)
    try {
      await create.mutateAsync({
        name: values.name.trim(),
        username: values.username,
        email: orNull(values.email),
        phone: orNull(values.phone),
        password: values.password,
        role_id: manager ? null : values.role_id,
        is_manager: manager,
      })
      await navigate({ to: '/admin/outlets/$oid/users', params: { oid } })
    } catch (caught) {
      const message = apiErrorMessage(tCommon, caught)
      if (caught instanceof ApiError && caught.code === 'username_taken') {
        form.setError('username', { type: 'api', message }, { shouldFocus: true })
      } else if (caught instanceof ApiError && passwordErrors.includes(caught.code)) {
        form.setError('password', { type: 'api', message }, { shouldFocus: true })
      } else if (!placeFieldErrors(caught, createStaffFields, form.setError)) {
        setError(message)
      }
    }
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        back={
          <BackLink to="/admin/outlets/$oid/users" params={{ oid }}>
            {t('detail.back')}
          </BackLink>
        }
        title={manager ? t('create.managerTitle') : t('create.title')}
        description={manager ? t('create.managerIntro') : t('create.intro')}
      />
      <form onSubmit={form.handleSubmit(submit)} noValidate className="grid max-w-xl gap-4">
        {error && <FormAlert>{error}</FormAlert>}
        <FormField label={t('fields.name')} error={fieldError(errors.name)} {...form.register('name')} />
        <FormField
          label={t('fields.username')}
          hint={t('form.usernameHint')}
          autoCapitalize="none"
          autoComplete="off"
          spellCheck={false}
          error={fieldError(errors.username)}
          {...form.register('username')}
        />
        {!manager && (
          <SelectField
            label={t('fields.role')}
            hint={choices.length < roles.length ? t('form.rolesHidden') : undefined}
            error={fieldError(errors.role_id)}
            {...form.register('role_id')}
          >
            <option value="">{t('form.chooseRole')}</option>
            {choices.map((role) => (
              <option key={role.role_id} value={role.role_id}>
                {role.name}
              </option>
            ))}
          </SelectField>
        )}
        <FormField
          label={t('fields.email')}
          type="email"
          hint={t('form.optional')}
          autoComplete="off"
          error={fieldError(errors.email)}
          {...form.register('email')}
        />
        <FormField
          label={t('fields.phone')}
          type="tel"
          hint={t('form.optional')}
          autoComplete="off"
          error={fieldError(errors.phone)}
          {...form.register('phone')}
        />
        <FormField
          label={t('fields.password')}
          type="password"
          autoComplete="new-password"
          hint={t('form.passwordHint')}
          error={fieldError(errors.password)}
          {...form.register('password')}
        />
        <FormField
          label={t('fields.confirm')}
          type="password"
          autoComplete="new-password"
          error={fieldError(errors.confirm)}
          {...form.register('confirm')}
        />
        <Button type="submit" className="h-11 justify-self-start text-title-md" disabled={isSubmitting}>
          {isSubmitting ? tCommon('actions.saving') : manager ? t('create.managerSubmit') : t('create.submit')}
        </Button>
      </form>
    </div>
  )
}
