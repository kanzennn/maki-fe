import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

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
} from './alert-dialog'
import { Button } from './button'

import { FormAlert } from './form-message'

/**
 * Asks before an action that takes effect at once — deactivating, deleting,
 * promoting — and stays open with the server's answer if it's refused.
 */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  destructive = false,
  onConfirm,
}: {
  /** The button that opens it. */
  trigger: ReactNode
  title: string
  description: ReactNode
  confirmLabel: string
  destructive?: boolean
  onConfirm: () => Promise<unknown>
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirm() {
    setError(null)
    setPending(true)
    try {
      await onConfirm()
      setOpen(false)
    } catch (caught) {
      setError(apiErrorMessage(t, caught))
    } finally {
      setPending(false)
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        setError(null)
      }}
    >
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {error && <FormAlert>{error}</FormAlert>}
        <AlertDialogFooter>
          <AlertDialogCancel className="h-11">{t('actions.cancel')}</AlertDialogCancel>
          <Button
            variant={destructive ? 'destructive' : 'default'}
            className="h-11"
            disabled={pending}
            onClick={() => void confirm()}
          >
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
