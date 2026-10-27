import { useTranslation } from 'react-i18next'

import { Checkbox } from '@/components/shared/checkbox'
import { Label } from '@/components/ui/label'

import type { PermissionGroup } from '@/modules/role/types'
import { togglePermission } from '@/modules/role/usecases/toggle-permission.usecase'
import { moduleName, permissionName } from './permission-names'

type ChecklistProps = {
  groups: PermissionGroup[]
  value: string[]
  onChange: (next: string[]) => void
  /**
   * Whether code may be ticked: no one gives a permission they lack, though
   * one the role held before stays theirs to keep or drop.
   */
  allowed: (code: string) => boolean
}

/** A role's permissions, ticked per module, as the catalog groups them. */
export function PermissionChecklist({ groups, value, onChange, allowed }: ChecklistProps) {
  const { t } = useTranslation('role')

  function toggle(code: string, checked: boolean) {
    onChange(togglePermission(value, code, checked, allowed))
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {groups.map((group) => (
        <fieldset key={group.module} className="grid content-start gap-1 rounded-card border border-outline p-4">
          <legend className="px-1 text-title-md text-on-surface">{moduleName(t, group.module)}</legend>
          {group.permissions.map((code) => {
            const id = `permission-${code}`
            const locked = !allowed(code)
            return (
              <div key={code} className="flex min-h-11 items-start gap-3 py-1">
                <Checkbox
                  id={id}
                  className="mt-0.5"
                  checked={value.includes(code)}
                  disabled={locked}
                  aria-describedby={locked ? `${id}-locked` : undefined}
                  onCheckedChange={(checked) => toggle(code, checked === true)}
                />
                <div className="grid gap-0.5">
                  <Label htmlFor={id} className="text-body-md leading-5 text-on-surface">
                    {permissionName(t, code)}
                  </Label>
                  {locked && (
                    <p id={`${id}-locked`} className="text-label-md text-on-surface-variant">
                      {t('form.notHeld')}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </fieldset>
      ))}
    </div>
  )
}
