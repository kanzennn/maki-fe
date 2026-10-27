import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import type { Role } from '@/modules/role/types'
import { FormField } from '@/components/shared/form-field'
import { FormAlert } from '@/components/shared/form-message'
import { SelectField } from '@/components/shared/select-field'
import { useFieldError } from '@/hooks/use-field-error'
import { apiErrorMessage } from '@/lib/api-error-message'
import { placeFieldErrors } from '@/components/shared/form-errors'
import { Button } from '@/components/shared/button'

import { validationResolver } from '@/hooks/validation-resolver'
import { staffProfileFields, type Staff, type StaffProfileValues } from '@/modules/user/types'
import { validateStaffProfile } from '@/modules/user/validations/staff.validation'

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
  onSubmit: (values: StaffProfileValues) => Promise<unknown>
}) {
  const { t } = useTranslation('user')
  const { t: tCommon } = useTranslation()
  const fieldError = useFieldError()
  const [error, setError] = useState<string | null>(null)
  const form = useForm<StaffProfileValues>({
    resolver: validationResolver(validateStaffProfile),
    defaultValues: {
      name: staff.name,
      email: staff.email ?? '',
      phone: staff.phone ?? '',
      role_id: staff.role?.role_id ?? '',
      is_manager: staff.is_manager,
    },
  })
  const { errors, isSubmitting, isDirty } = form.formState

  async function submit(values: StaffProfileValues) {
    setError(null)
    try {
      await onSubmit(values)
    } catch (caught) {
      if (!placeFieldErrors(caught, staffProfileFields, form.setError)) setError(apiErrorMessage(tCommon, caught))
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
