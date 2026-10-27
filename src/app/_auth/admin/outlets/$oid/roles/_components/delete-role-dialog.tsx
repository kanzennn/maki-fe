import { useNavigate, useParams } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ApiError } from '@/lib/http'
import { FormAlert } from '@/components/shared/form-message'
import { apiErrorMessage } from '@/lib/api-error-message'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/shared/alert-dialog'
import { Button } from '@/components/shared/button'

import { useDeleteRole, useForgetRole } from '@/hooks/role/role.queries'
import type { RoleDetail } from '@/modules/role/types'

type Holder = { user_id: string; name: string }

/**
 * Deletes a role nobody holds. While someone does, it names them instead:
 * they move to another role first. The server's 409 says the same if a user
 * got the role meanwhile.
 */
export function DeleteRoleDialog({ role }: { role: RoleDetail }) {
  const { t } = useTranslation('role')
  const { t: tCommon } = useTranslation()
  const { oid } = useParams({ from: '/_auth/admin/outlets/$oid' })
  const navigate = useNavigate()
  const remove = useDeleteRole(oid, role.role_id)
  const forget = useForgetRole(oid)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [holders, setHolders] = useState<Holder[]>(role.users)

  async function confirm() {
    setError(null)
    try {
      await remove.mutateAsync()
      setOpen(false)
      await navigate({ to: '/admin/outlets/$oid/roles', params: { oid } })
      forget(role.role_id)
    } catch (caught) {
      const users = caught instanceof ApiError && caught.code === 'role_in_use' ? caught.details?.users : undefined
      if (Array.isArray(users)) setHolders(users as Holder[])
      else setError(apiErrorMessage(tCommon, caught))
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        setError(null)
        setHolders(role.users)
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="h-11 text-error">
          {t('delete.action')}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('delete.title', { name: role.name })}</AlertDialogTitle>
          <AlertDialogDescription>
            {holders.length > 0 ? t('delete.inUse', { count: holders.length }) : t('delete.body')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {holders.length > 0 && (
          <ul className="grid list-disc gap-1 pl-5 text-body-md text-on-surface">
            {holders.map((holder) => (
              <li key={holder.user_id}>{holder.name}</li>
            ))}
          </ul>
        )}
        {error && <FormAlert>{error}</FormAlert>}
        <AlertDialogFooter>
          <AlertDialogCancel className="h-11">{tCommon('actions.cancel')}</AlertDialogCancel>
          {holders.length === 0 && (
            <Button variant="destructive" className="h-11" disabled={remove.isPending} onClick={() => void confirm()}>
              {t('delete.submit')}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
