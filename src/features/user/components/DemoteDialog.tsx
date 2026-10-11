import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import type { Role } from '@/shared/api/roles'
import { FormAlert } from '@/shared/components/FormMessage'
import { SelectField } from '@/shared/components/SelectField'
import { apiErrorMessage } from '@/shared/lib/api-error-message'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/dialog'

import { useUpdateStaff, type Staff } from '../api'

/**
 * The Owner makes a Manager staff again, with one of the outlet's roles: a
 * Manager held every permission, so any role will do. Their sessions end.
 */
export function DemoteDialog({
  outletId,
  staff,
  roles,
  onDone,
}: {
  outletId: string
  staff: Staff
  roles: readonly Role[]
  onDone: (notice: string) => void
}) {
  const { t } = useTranslation('user')
  const { t: tCommon } = useTranslation()
  const update = useUpdateStaff(outletId, staff.user_id)
  const [open, setOpen] = useState(false)
  const [roleId, setRoleId] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!roleId) return
    setError(null)
    try {
      await update.mutateAsync({
        name: staff.name,
        email: staff.email,
        phone: staff.phone,
        is_manager: false,
        role_id: roleId,
      })
      setOpen(false)
      onDone(t('demote.done', { name: staff.name }))
    } catch (caught) {
      setError(apiErrorMessage(tCommon, caught))
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        setRoleId('')
        setError(null)
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="h-11">
          {t('demote.action')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={(e) => void submit(e)} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{t('demote.title', { name: staff.name })}</DialogTitle>
            <DialogDescription>{t('demote.body')}</DialogDescription>
          </DialogHeader>
          {error && <FormAlert>{error}</FormAlert>}
          {roles.length === 0 ? (
            <p className="text-body-md text-on-surface-variant">{t('demote.noRoles')}</p>
          ) : (
            <SelectField label={t('fields.role')} value={roleId} onChange={(e) => setRoleId(e.target.value)}>
              <option value="">{t('form.chooseRole')}</option>
              {roles.map((role) => (
                <option key={role.role_id} value={role.role_id}>
                  {role.name}
                </option>
              ))}
            </SelectField>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" className="h-11">
                {tCommon('actions.cancel')}
              </Button>
            </DialogClose>
            <Button type="submit" className="h-11" disabled={!roleId || update.isPending}>
              {t('demote.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
