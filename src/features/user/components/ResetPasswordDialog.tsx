import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { FormField } from '@/shared/components/FormField'
import { FormAlert } from '@/shared/components/FormMessage'
import { useFieldError } from '@/shared/hooks/useFieldError'
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

import { useResetStaffPassword, type Staff } from '../api'
import { temporaryPasswordSchema, type TemporaryPasswordValues } from '../schemas'

/**
 * Gives the account a temporary password, typed here and passed on to its
 * user, who must replace it at the next sign-in. Their sessions end at once.
 */
export function ResetPasswordDialog({
  outletId,
  staff,
  onDone,
}: {
  outletId: string
  staff: Staff
  onDone: (notice: string) => void
}) {
  const { t } = useTranslation('user')
  const { t: tCommon } = useTranslation()
  const fieldError = useFieldError()
  const reset = useResetStaffPassword(outletId, staff.user_id)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const form = useForm<TemporaryPasswordValues>({
    resolver: zodResolver(temporaryPasswordSchema),
    defaultValues: { password: '', confirm: '' },
  })
  const { errors, isSubmitting } = form.formState

  async function submit(values: TemporaryPasswordValues) {
    setError(null)
    try {
      await reset.mutateAsync(values.password)
      setOpen(false)
      onDone(t('reset.done', { name: staff.name }))
    } catch (caught) {
      setError(apiErrorMessage(tCommon, caught))
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        setError(null)
        form.reset()
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="h-11">
          {t('reset.action')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={form.handleSubmit(submit)} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{t('reset.title', { name: staff.name })}</DialogTitle>
            <DialogDescription>{t('reset.body')}</DialogDescription>
          </DialogHeader>
          {error && <FormAlert>{error}</FormAlert>}
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
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" className="h-11">
                {tCommon('actions.cancel')}
              </Button>
            </DialogClose>
            <Button type="submit" className="h-11" disabled={isSubmitting}>
              {t('reset.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
