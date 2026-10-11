import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ApiError } from '@/shared/api/client'
import { FormAlert } from '@/shared/components/FormMessage'
import { apiErrorMessage } from '@/shared/lib/api-error-message'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/ui/alert-dialog'
import { Button } from '@/shared/ui/button'

import { useDeleteTable, type Table } from '../api'

/**
 * Deletes a table no customers are seated at. While they are, it says so
 * instead: the cashier releases it first. The server's 409 says the same if
 * a sale seated them meanwhile.
 */
export function DeleteTableDialog({
  outletId,
  table,
  onDone,
}: {
  outletId: string
  table: Table
  onDone: (notice: string) => void
}) {
  const { t } = useTranslation('table')
  const { t: tCommon } = useTranslation()
  const remove = useDeleteTable(outletId, table.table_id)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [occupied, setOccupied] = useState(table.status === 'occupied')

  async function confirm() {
    setError(null)
    try {
      await remove.mutateAsync()
      setOpen(false)
      onDone(t('delete.done', { name: table.name }))
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === 'table_occupied') setOccupied(true)
      else setError(apiErrorMessage(tCommon, caught))
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        setError(null)
        setOccupied(table.status === 'occupied')
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="h-11 text-error">
          {t('delete.action')}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('delete.title', { name: table.name })}</AlertDialogTitle>
          <AlertDialogDescription>{occupied ? t('delete.occupied') : t('delete.body')}</AlertDialogDescription>
        </AlertDialogHeader>
        {error && <FormAlert>{error}</FormAlert>}
        <AlertDialogFooter>
          <AlertDialogCancel className="h-11">{tCommon('actions.cancel')}</AlertDialogCancel>
          {!occupied && (
            <Button variant="destructive" className="h-11" disabled={remove.isPending} onClick={() => void confirm()}>
              {t('delete.action')}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
