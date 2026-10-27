import { useNavigate } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { FormField } from '@/components/shared/form-field'
import { FormAlert } from '@/components/shared/form-message'
import { apiErrorMessage } from '@/lib/api-error-message'
import { Button } from '@/components/shared/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/shared/dialog'

import { useDeleteOutlet, useForgetOutlet } from '@/hooks/outlet/outlet.queries'
import type { Outlet } from '@/modules/outlet/types'
import { confirmsOutletName } from '@/modules/outlet/validations/outlet.validation'

/**
 * Deletes an inactive outlet once its name is typed again, as the server
 * checks it: the same letters and case, spaces around it aside.
 */
export function DeleteOutletDialog({ outlet }: { outlet: Outlet }) {
  const { t } = useTranslation('outlet')
  const { t: tCommon } = useTranslation()
  const navigate = useNavigate()
  const forget = useForgetOutlet()
  const remove = useDeleteOutlet(outlet)
  const [typed, setTyped] = useState('')
  const [error, setError] = useState<string | null>(null)
  const matches = confirmsOutletName(outlet, typed)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!matches) return
    setError(null)
    try {
      await remove.mutateAsync(typed)
      await navigate({ to: '/admin/outlets' })
      forget(outlet.outlet_id)
    } catch (caught) {
      setError(apiErrorMessage(tCommon, caught))
    }
  }

  return (
    <Dialog
      onOpenChange={() => {
        setTyped('')
        setError(null)
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="h-11 text-error">
          {t('delete.action')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={(e) => void submit(e)} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{t('delete.title', { name: outlet.name })}</DialogTitle>
            <DialogDescription>{t('delete.body')}</DialogDescription>
          </DialogHeader>
          {error && <FormAlert>{error}</FormAlert>}
          <FormField
            label={t('delete.confirm', { name: outlet.name })}
            autoComplete="off"
            spellCheck={false}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
          />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" className="h-11">
                {tCommon('actions.cancel')}
              </Button>
            </DialogClose>
            <Button type="submit" variant="destructive" className="h-11" disabled={!matches || remove.isPending}>
              {t('delete.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
