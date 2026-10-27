import { useState } from 'react'
import { useForm, useWatch, type FieldError } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { ApiError } from '@/lib/http'
import { FormField } from '@/components/shared/form-field'
import { FormAlert } from '@/components/shared/form-message'
import { SectionHeading } from '@/components/shared/page-heading'
import { useFieldError } from '@/hooks/use-field-error'
import { apiErrorMessage } from '@/lib/api-error-message'
import { placeFieldErrors } from '@/components/shared/form-errors'
import { useSession } from '@/hooks/use-session'
import { Button } from '@/components/shared/button'

import { validationResolver } from '@/hooks/validation-resolver'
import { canGivePermission } from '@/modules/role/permissions'
import { roleFields, type PermissionGroup, type RoleDetail, type RoleFormValues } from '@/modules/role/types'
import { validateRoleForm } from '@/modules/role/validations/role.validation'

import { PermissionChecklist } from './permission-checklist'

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
  onSubmit: (values: RoleFormValues) => Promise<unknown>
}) {
  const { t } = useTranslation('role')
  const { t: tCommon } = useTranslation()
  const fieldError = useFieldError()
  const user = useSession((s) => s.user)
  const [error, setError] = useState<string | null>(null)
  const form = useForm<RoleFormValues>({
    resolver: validationResolver(validateRoleForm),
    defaultValues: { name: role?.name ?? '', description: role?.description ?? '', permissions: role?.permissions ?? [] },
  })
  const { errors, isSubmitting } = form.formState
  const permissions = useWatch({ control: form.control, name: 'permissions' })
  const before = role?.permissions ?? []

  async function submit(values: RoleFormValues) {
    setError(null)
    try {
      await onSubmit(values)
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
          allowed={(code) => canGivePermission(user, code, before)}
        />
        {errors.permissions && <p className="text-label-md text-error">{fieldError(errors.permissions as FieldError | undefined)}</p>}
      </section>
      <Button type="submit" className="h-11 justify-self-start text-title-md" disabled={isSubmitting}>
        {isSubmitting ? tCommon('actions.saving') : submitLabel}
      </Button>
    </form>
  )
}
