import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import type { Role } from '@/shared/api/roles'
import { FormField } from '@/shared/components/FormField'
import { FormAlert } from '@/shared/components/FormMessage'
import { SelectField } from '@/shared/components/SelectField'
import { useFieldError } from '@/shared/hooks/useFieldError'
import { apiErrorMessage } from '@/shared/lib/api-error-message'
import { placeFieldErrors } from '@/shared/lib/form-errors'
import { Button } from '@/shared/ui/button'

import type { Staff, UpdateStaffRequest } from '../api'
import { orNull, profileFields, profileSchema, profileValues, type ProfileValues } from '../schemas'

/**
 * An account's name, email and phone, and a staff member's role. An email
 * changed here isn't confirmed: its user confirms it again.
 */
export function ProfileForm({
  staff,
  roles,
  onSubmit,
}: {
  staff: Staff
  /** The roles that may be given; a Manager has none. */
  roles: readonly Role[]
  onSubmit: (body: UpdateStaffRequest) => Promise<unknown>
}) {
  const { t } = useTranslation('user')
  const { t: tCommon } = useTranslation()
  const fieldError = useFieldError()
  const [error, setError] = useState<string | null>(null)
  const form = useForm<ProfileValues>({ resolver: zodResolver(profileSchema), defaultValues: profileValues(staff) })
  const { errors, isSubmitting, isDirty } = form.formState

  async function submit(values: ProfileValues) {
    setError(null)
    try {
      await onSubmit({
        name: values.name.trim(),
        email: orNull(values.email),
        phone: orNull(values.phone),
        is_manager: staff.is_manager,
        role_id: staff.is_manager ? null : values.role_id,
      })
    } catch (caught) {
      if (!placeFieldErrors(caught, profileFields, form.setError)) setError(apiErrorMessage(tCommon, caught))
    }
  }

  return (
    <form onSubmit={form.handleSubmit(submit)} noValidate className="grid max-w-xl gap-4">
      {error && <FormAlert>{error}</FormAlert>}
      <FormField label={t('fields.name')} error={fieldError(errors.name)} {...form.register('name')} />
      {!staff.is_manager && (
        <SelectField
          label={t('fields.role')}
          hint={t('form.roleHint')}
          error={fieldError(errors.role_id)}
          {...form.register('role_id')}
        >
          {!staff.role && <option value="">{t('form.chooseRole')}</option>}
          {roles.map((role) => (
            <option key={role.role_id} value={role.role_id}>
              {role.name}
            </option>
          ))}
        </SelectField>
      )}
      <FormField
        label={t('fields.email')}
        type="email"
        hint={t('form.emailHint')}
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
      <Button type="submit" className="h-11 justify-self-start text-title-md" disabled={isSubmitting || !isDirty}>
        {isSubmitting ? tCommon('actions.saving') : t('edit.submit')}
      </Button>
    </form>
  )
}
