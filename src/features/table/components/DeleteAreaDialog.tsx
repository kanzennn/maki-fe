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

import { useDeleteArea, type Area } from '../api'

/**
 * Deletes an area that holds no tables, and its layout with it. While it
 * holds some, it says how many instead: they move or go first. The server's
 * 409 says the same if a table joined it meanwhile.
 */
export function DeleteAreaDialog({
  outletId,
  area,
  onDone,
}: {
  outletId: string
  area: Area
  onDone: (notice: string) => void
}) {
  const { t } = useTranslation('table')
  const { t: tCommon } = useTranslation()
  const remove = useDeleteArea(outletId, area.area_id)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tables, setTables] = useState(area.table_count)

  async function confirm() {
    setError(null)
    try {
      await remove.mutateAsync()
      setOpen(false)
      onDone(t('areas.delete.done', { name: area.name }))
    } catch (caught) {
      const held = caught instanceof ApiError && caught.code === 'area_not_empty' ? caught.details?.tables : undefined
      if (typeof held === 'number') setTables(held)
      else setError(apiErrorMessage(tCommon, caught))
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        setError(null)
        setTables(area.table_count)
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="h-11 text-error">
          {t('areas.delete.action')}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('areas.delete.title', { name: area.name })}</AlertDialogTitle>
          <AlertDialogDescription>
            {tables > 0 ? t('areas.delete.notEmpty', { count: tables }) : t('areas.delete.body')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <FormAlert>{error}</FormAlert>}
        <AlertDialogFooter>
          <AlertDialogCancel className="h-11">{tCommon('actions.cancel')}</AlertDialogCancel>
          {tables === 0 && (
            <Button variant="destructive" className="h-11" disabled={remove.isPending} onClick={() => void confirm()}>
              {t('areas.delete.action')}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
