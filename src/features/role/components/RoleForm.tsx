import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm, useWatch, type FieldError } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { ApiError } from '@/shared/api/client'
import { FormField } from '@/shared/components/FormField'
import { FormAlert } from '@/shared/components/FormMessage'
import { SectionHeading } from '@/shared/components/PageHeading'
import { useFieldError } from '@/shared/hooks/useFieldError'
import { apiErrorMessage } from '@/shared/lib/api-error-message'
import { placeFieldErrors } from '@/shared/lib/form-errors'
import { can, type Permission } from '@/shared/lib/permissions'
import { useSession } from '@/shared/lib/session'
import { Button } from '@/shared/ui/button'

import type { PermissionGroup, RoleDetail, RoleInput } from '../api'
import { roleFields, roleSchema, roleValues, toRoleInput, type RoleValues } from '../schemas'
import { PermissionChecklist } from './PermissionChecklist'

/**
 * A role's name, description and permissions. Only a permission the user
 * holds can be added; one the role had already can stay or go. The server
 * refuses anything else anyway.
 */
export function RoleForm({
  role,
  groups,
  submitLabel,
  onSubmit,
}: {
  role?: RoleDetail
  groups: PermissionGroup[]
  submitLabel: string
  onSubmit: (input: RoleInput) => Promise<unknown>
}) {
  const { t } = useTranslation('role')
  const { t: tCommon } = useTranslation()
  const fieldError = useFieldError()
  const user = useSession((s) => s.user)
  const [error, setError] = useState<string | null>(null)
  const form = useForm<RoleValues>({ resolver: zodResolver(roleSchema), defaultValues: roleValues(role) })
  const { errors, isSubmitting } = form.formState
  const permissions = useWatch({ control: form.control, name: 'permissions' })
  const before = role?.permissions ?? []

  async function submit(values: RoleValues) {
    setError(null)
    try {
      await onSubmit(toRoleInput(values))
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === 'role_name_taken') {
        form.setError('name', { type: 'api', message: apiErrorMessage(tCommon, caught) }, { shouldFocus: true })
      } else if (!placeFieldErrors(caught, roleFields, form.setError)) {
        setError(apiErrorMessage(tCommon, caught))
      }
    }
  }

  return (
    <form onSubmit={form.handleSubmit(submit)} noValidate className="grid gap-6">
      {error && <FormAlert>{error}</FormAlert>}
      <div className="grid max-w-xl gap-4">
        <FormField label={t('fields.name')} error={fieldError(errors.name)} {...form.register('name')} />
        <FormField
          label={t('fields.description')}
          hint={t('form.descriptionHint')}
          error={fieldError(errors.description)}
          {...form.register('description')}
        />
      </div>
      <section aria-labelledby="role-permissions" className="grid gap-3">
        <div className="grid gap-1">
          <SectionHeading id="role-permissions">
            {t('fields.permissions')}
          </SectionHeading>
          <p className="text-body-md text-on-surface-variant">{t('form.permissionsHint')}</p>
        </div>
        <PermissionChecklist
          groups={groups}
          value={permissions}
          onChange={(next) => form.setValue('permissions', next, { shouldDirty: true })}
          allowed={(code) => can(user, code as Permission) || before.includes(code)}
        />
        {errors.permissions && <p className="text-label-md text-error">{fieldError(errors.permissions as FieldError | undefined)}</p>}
      </section>
      <Button type="submit" className="h-11 justify-self-start text-title-md" disabled={isSubmitting}>
        {isSubmitting ? tCommon('actions.saving') : submitLabel}
      </Button>
    </form>
  )
}
